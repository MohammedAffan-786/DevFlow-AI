import crypto from 'crypto';
import { Finding, SeverityLevel, FindingCategory, EvidenceStatus } from '@devflow/shared';
import { ScannedFile } from './fileScanner';

interface CodeReviewRule {
  id: string;
  category: FindingCategory;
  severity: SeverityLevel;
  pattern: RegExp;
  description: string;
  explanation: string;
  whyItMatters: string;
  suggestedFix: string;
  confidenceScore: number;
  evidenceStatus: EvidenceStatus;
  generateFix: (match: string, snippet: string) => string;
}

export class CodeReviewer {
  // Deterministic code quality, runtime defect, and logical analysis rules
  private static reviewRules: CodeReviewRule[] = [
    // 1. Unhandled Promise Rejection / Async without try-catch in critical dispatcher
    {
      id: 'CR-ASYNC-TRY-CATCH',
      category: 'EXCEPTION_HANDLING',
      severity: 'HIGH',
      pattern: /async\s+(?:function\s+[a-zA-Z0-9_]+|\([a-zA-Z0-9_,\s]*\)\s*=>)\s*\{(?![^}]*\btry\b)[^}]*await\s+/,
      description: 'Asynchronous function executes `await` without enclosing try/catch or error propagation.',
      explanation: 'Network timeouts, serialization errors, or service failures inside unhandled async calls trigger unhandled promise rejections, crashing the process in Node.js LTS.',
      whyItMatters: 'Unhandled rejections cause unexpected worker crashes, dropping concurrent requests and causing service downtime.',
      suggestedFix: 'Wrap asynchronous await operations in structured try/catch blocks with contextual error logging.',
      confidenceScore: 0.92,
      evidenceStatus: 'CONFIRMED',
      generateFix: (_m, snippet) => `try {\n  ${snippet.trim()}\n} catch (error) {\n  logger.error('Operation failed', error);\n  throw error;\n}`,
    },

    // 2. Empty Catch Block (Swallowed Error)
    {
      id: 'CR-EMPTY-CATCH',
      category: 'EXCEPTION_HANDLING',
      severity: 'MEDIUM',
      pattern: /catch\s*\([a-zA-Z0-9_]*\)\s*\{\s*\}/,
      description: 'Empty catch block silently suppresses exception without logging or remediation.',
      explanation: 'Swallowing errors blinds observability tools, making runtime bugs virtually impossible to diagnose in production logs.',
      whyItMatters: 'Silent failures propagate corrupted state downstream, resulting in erratic system behavior and data inconsistencies.',
      suggestedFix: 'Log the trapped error with correlation context or gracefully rethrow.',
      confidenceScore: 0.98,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => 'catch (err) {\n  logger.warn("Non-fatal exception handled", { err });\n}',
    },

    // 3. Null Reference / Unchecked Property Access on Nullable Identifier
    {
      id: 'CR-NULL-POINTER',
      category: 'NULL_POINTER',
      severity: 'HIGH',
      pattern: /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:[a-zA-Z0-9_.]+\.find\([^)]+\)|[a-zA-Z0-9_.]+\.get\([^)]+\));\s*\n\s*(?!\s*if\s*\(\s*!\1)\1\.[a-zA-Z0-9_]+/,
      description: 'Potential null pointer dereference accessing properties of lookup result without guard.',
      explanation: 'Methods like `.find()` return `undefined` when elements are not located. Immediate dereferencing throws a `TypeError: Cannot read properties of undefined`.',
      whyItMatters: 'Causes unexpected HTTP 500 runtime errors on edge-case inputs.',
      suggestedFix: 'Use optional chaining (`?.`) or an explicit null guard before property access.',
      confidenceScore: 0.91,
      evidenceStatus: 'CONFIRMED',
      generateFix: (match) => match.replace(/\.([a-zA-Z0-9_]+)$/, '?.$1'),
    },

    // 4. Assignment inside Conditional Expression (= instead of ===)
    {
      id: 'CR-ASSIGN-IN-CONDITIONAL',
      category: 'LOGICAL_ERROR',
      severity: 'HIGH',
      pattern: /if\s*\(\s*([a-zA-Z0-9_]+)\s*=\s*([^=][^)]*)\)/,
      description: 'Assignment operator (`=`) utilized within conditional statement instead of comparison (`===`).',
      explanation: 'Using `=` in an `if` statement assigns the value rather than checking equality. The condition will always evaluate to the truthiness of the assigned value.',
      whyItMatters: 'Creates critical logic flaws where unintended branches are taken 100% of the time in production.',
      suggestedFix: 'Replace assignment `=` with strict equality check `===`.',
      confidenceScore: 0.95,
      evidenceStatus: 'CONFIRMED',
      generateFix: (match) => match.replace(/=/, '==='),
    },

    // 5. Quadratic Nested Iteration (Performance Bottleneck)
    {
      id: 'CR-NESTED-LOOP-PERF',
      category: 'PERFORMANCE',
      severity: 'MEDIUM',
      pattern: /(?:for\s*\([^)]*\)|\.forEach\([^)]*\)|\.map\([^)]*\))\s*\{[^}]*(?:\.find\(|\.filter\(|\.some\()/,
      description: 'Nested collection iteration introduces O(n^2) quadratic computational complexity.',
      explanation: 'Calling `.find()` or `.filter()` inside an outer iteration loop creates quadratic time complexity, causing exponential latency degradation as dataset sizes grow.',
      whyItMatters: 'Large datasets block the Node.js single-threaded event loop, spiking p99 API latencies and exhausting CPU.',
      suggestedFix: 'Pre-index the inner collection into a `Map` or `Set` to reduce lookups from O(n) to O(1).',
      confidenceScore: 0.88,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => '// Pre-index lookup table for O(1) retrieval\nconst lookupMap = new Map(items.map(i => [i.id, i]));\nitems.forEach(item => {\n  const match = lookupMap.get(item.targetId);\n});',
    },

    // 6. Synchronous File I/O in Server Event Loop
    {
      id: 'CR-SYNC-IO-EVENT-LOOP',
      category: 'PERFORMANCE',
      severity: 'MEDIUM',
      pattern: /fs\.(?:readFileSync|writeFileSync|statSync|existsSync)\(/,
      description: 'Synchronous filesystem operation blocks the Node.js event loop.',
      explanation: 'Synchronous I/O halts the entire Node.js thread until disk operations complete. Other concurrent HTTP requests cannot be serviced during this blocking window.',
      whyItMatters: 'Significantly degrades system throughput under concurrent load and introduces latency spikes.',
      suggestedFix: 'Refactor to asynchronous Promise-based API `fs.promises.readFile`.',
      confidenceScore: 0.94,
      evidenceStatus: 'CONFIRMED',
      generateFix: (match) => match.replace(/fs\.([a-zA-Z]+)Sync/, 'await fs.promises.$1'),
    },

    // 7. Resource Leak / Missing Cleanup
    {
      id: 'CR-UNCLOSED-STREAM',
      category: 'RESOURCE_LEAK',
      severity: 'HIGH',
      pattern: /createReadStream\([^)]*\)(?![\s\S]*?\.(?:on\(['"]end['"]|on\(['"]close['"]|pipe\()[\s\S]*?\bdestroy\b)/,
      description: 'Filesystem read stream created without explicit termination or destroy handlers.',
      explanation: 'Streams that are not closed or piped to completion retain active file descriptors in the operating system.',
      whyItMatters: 'Leaking file descriptors eventually triggers `EMFILE: too many open files` OS errors, crashing the process.',
      suggestedFix: 'Ensure streams are managed with pipeline or have explicit error and close cleanup handlers.',
      confidenceScore: 0.85,
      evidenceStatus: 'SUSPECTED',
      generateFix: () => 'const stream = fs.createReadStream(path);\ntry {\n  await pipeline(stream, destination);\n} finally {\n  stream.destroy();\n}',
    },

    // 8. Unsanitized Input Validation
    {
      id: 'CR-MISSING-INPUT-VALIDATION',
      category: 'INPUT_VALIDATION',
      severity: 'HIGH',
      pattern: /app\.(?:post|put|patch)\s*\([^,]+,\s*(?:async\s*)?\((?:req,\s*res|req:[^,]+,\s*res:[^)]+)\)\s*=>\s*\{(?![^}]*\b(?:validate|zod|joi|parse)\b)[^}]*req\.body\./,
      description: 'Route handler ingests `req.body` directly without runtime schema validation.',
      explanation: 'Express request payloads are untyped at runtime. Relying on TypeScript types without runtime validation (e.g. Zod) allows malformed payloads into domain logic.',
      whyItMatters: 'Causes unexpected type coercion errors, data corruption, and application crashes.',
      suggestedFix: 'Apply Zod validation middleware before invoking request handlers.',
      confidenceScore: 0.90,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => 'router.post("/endpoint", validate({ body: RequestSchema }), handler);',
    },
  ];

  // Run comprehensive code review across discovered source files
  static reviewFile(file: ScannedFile): Finding[] {
    const findings: Finding[] = [];
    const lines = file.content.split('\n');

    for (const rule of this.reviewRules) {
      const match = rule.pattern.exec(file.content);
      if (match) {
        const matchIndex = match.index;
        const textBefore = file.content.substring(0, matchIndex);
        const startLine = textBefore.split('\n').length;
        const matchedLinesCount = match[0].split('\n').length;
        const endLine = Math.min(lines.length, startLine + matchedLinesCount - 1);

        // Verify that line numbers are physically accurate in file
        const snippetLines = lines.slice(Math.max(0, startLine - 1), endLine);
        const physicalSnippet = snippetLines.join('\n');

        findings.push({
          findingId: `cr_${crypto.randomUUID().substring(0, 8)}`,
          filePath: file.path,
          startLine,
          endLine,
          severity: rule.severity,
          category: rule.category,
          description: rule.description,
          explanation: rule.explanation,
          whyItMatters: rule.whyItMatters,
          suggestedFix: rule.suggestedFix,
          correctedCodeExample: rule.generateFix(match[0], physicalSnippet),
          confidenceScore: rule.confidenceScore,
          evidenceStatus: rule.evidenceStatus,
        });
      }
    }

    return findings;
  }
}
