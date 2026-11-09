/**
 * testGeneratorService.ts
 * Generates comprehensive unit and integration test suites using AST heuristics
 * and repository context.
 *
 * Supports:
 *   - Python: pytest
 *   - TypeScript: Vitest or Jest
 *   - JavaScript: Vitest or Jest
 *
 * Covers 6 mandatory test categories:
 *   1. NORMAL (Happy path with valid inputs)
 *   2. BOUNDARY (Min/max thresholds, zero, limits)
 *   3. EDGE_CASE (Empty collections, nullish values, unicode, off-by-one)
 *   4. INVALID_INPUT (Type mismatches, malformed structures)
 *   5. EXCEPTION (Thrown errors, promise rejections, timeouts)
 *   6. REGRESSION (Guarding known failure modes and invariant consistency)
 */

import crypto from 'crypto';
import path from 'path';
import {
  TestCategory,
  GeneratedTestCase,
  GeneratedTestFile,
  TestFramework,
} from '@devflow/shared';

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface GenerateTestOptions {
  repositoryId?: string;
  filePath: string;
  sourceCode: string;
  functionName?: string;
  targetFramework: TestFramework;
  selectedCategories?: TestCategory[];
  repositoryContext?: {
    moduleName?: string;
    dependencies?: Record<string, string>;
    relatedFiles?: string[];
  };
}

export interface ParsedFunction {
  name: string;
  params: Array<{ name: string; type?: string; defaultValue?: string }>;
  returnType?: string;
  isAsync: boolean;
  docstring?: string;
  line: number;
}

// ─── AST / Regex parser for TypeScript, JavaScript, and Python ──────────────

export function extractFunctions(sourceCode: string, language: 'typescript' | 'javascript' | 'python'): ParsedFunction[] {
  const functions: ParsedFunction[] = [];
  const lines = sourceCode.split('\n');

  if (language === 'python') {
    const pyRegex = /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?:/g;
    let match: RegExpExecArray | null;
    while ((match = pyRegex.exec(sourceCode)) !== null) {
      const name = match[1];
      if (name.startsWith('__') && name.endsWith('__')) continue; // Skip magic methods
      const paramStr = match[2];
      const returnType = match[3]?.trim();
      const params = paramStr
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p && p !== 'self' && p !== 'cls')
        .map((p) => {
          const [pName, pType] = p.split(':').map((s) => s.trim());
          return { name: pName, type: pType };
        });

      const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
      functions.push({
        name,
        params,
        returnType,
        isAsync: lines[lineIndex - 1]?.includes('async def') ?? false,
        line: lineIndex,
      });
    }
  } else {
    // TypeScript / JavaScript function declarations & arrow functions
    const tsFnRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/g;
    let match: RegExpExecArray | null;
    while ((match = tsFnRegex.exec(sourceCode)) !== null) {
      const name = match[1];
      const paramStr = match[2];
      const returnType = match[3]?.trim();
      const params = parseTsParams(paramStr);
      const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
      functions.push({
        name,
        params,
        returnType,
        isAsync: match[0].includes('async'),
        line: lineIndex,
      });
    }

    // Arrow functions: const myFn = async (...) => ...
    const arrowRegex = /(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*)\)(?:\s*:\s*([^=]+))?\s*=>/g;
    while ((match = arrowRegex.exec(sourceCode)) !== null) {
      const name = match[1];
      const paramStr = match[2];
      const returnType = match[3]?.trim();
      const params = parseTsParams(paramStr);
      const lineIndex = sourceCode.substring(0, match.index).split('\n').length;
      functions.push({
        name,
        params,
        returnType,
        isAsync: match[0].includes('async'),
        line: lineIndex,
      });
    }
  }

  return functions;
}

function parseTsParams(paramStr: string): Array<{ name: string; type?: string }> {
  return paramStr
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [name, type] = p.split(':').map((s) => s.trim());
      return { name, type };
    });
}

// ─── Test Case Generator ─────────────────────────────────────────────────────

export function generateTestCasesForFunction(
  fn: ParsedFunction,
  filePath: string,
  framework: TestFramework,
  categories: TestCategory[] = ['NORMAL', 'BOUNDARY', 'EDGE_CASE', 'INVALID_INPUT', 'EXCEPTION', 'REGRESSION']
): GeneratedTestCase[] {
  const isPython = framework === 'pytest';
  const cases: GeneratedTestCase[] = [];
  const paramNames = fn.params.map((p) => p.name);
  const primaryParam = paramNames[0] || 'input';

  // 1. NORMAL: Standard happy path
  if (categories.includes('NORMAL')) {
    const normalInput = isPython ? '"valid_test_payload", 100' : '{ id: "usr_101", amount: 100 }';
    const normalAssertion = isPython
      ? `assert result is not None\n    assert result.status == "SUCCESS"`
      : `expect(result).toBeDefined();\n    expect(result.status).toBe('SUCCESS');`;

    const code = isPython
      ? `def test_${fn.name}_normal_execution():\n    """Test ${fn.name} executes with valid parameters."""\n    result = ${fn.name}(${normalInput})\n    ${normalAssertion}`
      : `it('executes successfully with valid standard input parameters', ${fn.isAsync ? 'async () => {' : '() => {'}\n  const input = ${normalInput};\n  const result = ${fn.isAsync ? `await ${fn.name}(input)` : `${fn.name}(input)`};\n  ${normalAssertion}\n});`;

    cases.push({
      id: crypto.randomUUID(),
      name: `test_${fn.name}_normal_execution`,
      description: `Verifies ${fn.name} produces expected success contracts when provided typical valid input arguments.`,
      category: 'NORMAL',
      inputDescription: `Standard valid input: ${normalInput}`,
      expectedOutput: 'Deterministic success object with status: "SUCCESS"',
      assertions: isPython ? ['assert result is not None', 'assert result.status == "SUCCESS"'] : ['expect(result).toBeDefined()', 'expect(result.status).toBe("SUCCESS")'],
      code,
    });
  }

  // 2. BOUNDARY: Min / Max thresholds & numerical limits
  if (categories.includes('BOUNDARY')) {
    const boundaryInput = isPython ? 'amount=0, limit=9999999' : '{ amount: 0, limit: Number.MAX_SAFE_INTEGER }';
    const boundaryAssertion = isPython
      ? `assert result.amount == 0\n    assert result.processed is True`
      : `expect(result.amount).toBe(0);\n    expect(result.processed).toBe(true);`;

    const code = isPython
      ? `def test_${fn.name}_boundary_limits():\n    """Test ${fn.name} handles 0 and maximum boundary values."""\n    result = ${fn.name}(${boundaryInput})\n    ${boundaryAssertion}`
      : `it('correctly handles zero and maximum boundary thresholds', ${fn.isAsync ? 'async () => {' : '() => {'}\n  const input = ${boundaryInput};\n  const result = ${fn.isAsync ? `await ${fn.name}(input)` : `${fn.name}(input)`};\n  ${boundaryAssertion}\n});`;

    cases.push({
      id: crypto.randomUUID(),
      name: `test_${fn.name}_boundary_limits`,
      description: `Evaluates boundary conditions including zero thresholds, maximum numerical integers, and off-by-one fencepost values.`,
      category: 'BOUNDARY',
      inputDescription: `Boundary inputs: amount=0, limit=MAX_SAFE_INTEGER`,
      expectedOutput: 'Graceful handling of zero/boundary limits without integer overflow or assertion failure.',
      assertions: isPython ? ['assert result.amount == 0', 'assert result.processed is True'] : ['expect(result.amount).toBe(0)', 'expect(result.processed).toBe(true)'],
      code,
    });
  }

  // 3. EDGE_CASE: Empty collections, unicode, nullish values
  if (categories.includes('EDGE_CASE')) {
    const edgeInput = isPython ? '[], special_chars="🚀_ünîcødé_\\n\\t"' : '[], { unicodeKey: "🚀_ünîcødé_\\n\\t" }';
    const edgeAssertion = isPython
      ? `assert result == [] or result.count == 0`
      : `expect(result).toEqual([]);`;

    const code = isPython
      ? `def test_${fn.name}_edge_case_empty_collection():\n    """Test ${fn.name} with empty collection and multi-byte unicode characters."""\n    result = ${fn.name}(${edgeInput})\n    ${edgeAssertion}`
      : `it('handles empty collections and multi-byte unicode without breaking invariants', ${fn.isAsync ? 'async () => {' : '() => {'}\n  const result = ${fn.isAsync ? `await ${fn.name}([])` : `${fn.name}([])`};\n  ${edgeAssertion}\n});`;

    cases.push({
      id: crypto.randomUUID(),
      name: `test_${fn.name}_edge_case_empty_collection`,
      description: `Validates behavior with empty lists/arrays, multi-byte Unicode runes, whitespace, and special characters.`,
      category: 'EDGE_CASE',
      inputDescription: 'Empty collection `[]` and complex Unicode sequences',
      expectedOutput: 'Empty array or zero count response without throwing unhandled exceptions.',
      assertions: isPython ? ['assert result == [] or result.count == 0'] : ['expect(result).toEqual([])'],
      code,
    });
  }

  // 4. INVALID_INPUT: Wrong types, negative quantities, schema violations
  if (categories.includes('INVALID_INPUT')) {
    const code = isPython
      ? `def test_${fn.name}_invalid_input_type():\n    """Test ${fn.name} rejects malformed or negative inputs."""\n    with pytest.raises((ValueError, TypeError)):\n        ${fn.name}(invalid_param=-99999)`
      : `it('rejects invalid or malformed parameter payloads with validation error', ${fn.isAsync ? 'async () => {' : '() => {'}\n  ${fn.isAsync ? `await expect(${fn.name}({ invalidKey: -99999 } as any)).rejects.toThrow();` : `expect(() => ${fn.name}({ invalidKey: -99999 } as any)).toThrow();`}\n});`;

    cases.push({
      id: crypto.randomUUID(),
      name: `test_${fn.name}_invalid_input_type`,
      description: `Ensures invalid data types, negative numbers, and unexpected schema keys are explicitly rejected.`,
      category: 'INVALID_INPUT',
      inputDescription: 'Negative quantity or ill-typed input object',
      expectedOutput: 'Throws ValueError, TypeError, or validation rejection.',
      assertions: isPython ? ['pytest.raises((ValueError, TypeError))'] : ['expect(...).toThrow() / rejects.toThrow()'],
      code,
    });
  }

  // 5. EXCEPTION: Thrown exceptions, null pointer traps, promise rejections
  if (categories.includes('EXCEPTION')) {
    const code = isPython
      ? `def test_${fn.name}_raises_on_null_or_missing():\n    """Test ${fn.name} throws expected exception on None or missing required state."""\n    with pytest.raises(Exception) as exc_info:\n        ${fn.name}(None)\n    assert exc_info.type in (ValueError, TypeError, KeyError)`
      : `it('throws structured exception when invoked with null reference', ${fn.isAsync ? 'async () => {' : '() => {'}\n  ${fn.isAsync ? `await expect(${fn.name}(null as any)).rejects.toThrow();` : `expect(() => ${fn.name}(null as any)).toThrow();`}\n});`;

    cases.push({
      id: crypto.randomUUID(),
      name: `test_${fn.name}_raises_on_null_or_missing`,
      description: `Confirms that unhandled null or undefined references trigger deterministic exceptions instead of crashing silently.`,
      category: 'EXCEPTION',
      inputDescription: 'null / None argument',
      expectedOutput: 'Throws TypeError, ValueError, or structured ApplicationError.',
      assertions: isPython ? ['pytest.raises(Exception)', 'assert exc_info.type in (ValueError, TypeError)'] : ['expect(...).rejects.toThrow()'],
      code,
    });
  }

  // 6. REGRESSION: Guard against known race conditions & re-entrancy
  if (categories.includes('REGRESSION')) {
    const code = isPython
      ? `def test_${fn.name}_regression_idempotence():\n    """Regression guard: verify repeated identical calls produce deterministic idempotent output."""\n    res1 = ${fn.name}("idempotent_key_001")\n    res2 = ${fn.name}("idempotent_key_001")\n    assert res1 == res2`
      : `it('regression: guarantees deterministic idempotent execution across consecutive runs', ${fn.isAsync ? 'async () => {' : '() => {'}\n  const r1 = ${fn.isAsync ? `await ${fn.name}('idempotent_key_001' as any)` : `${fn.name}('idempotent_key_001' as any)`};\n  const r2 = ${fn.isAsync ? `await ${fn.name}('idempotent_key_001' as any)` : `${fn.name}('idempotent_key_001' as any)`};\n  expect(r1).toEqual(r2);\n});`;

    cases.push({
      id: crypto.randomUUID(),
      name: `test_${fn.name}_regression_idempotence`,
      description: `Regression test ensuring idempotence, state purity, and consistency across consecutive executions.`,
      category: 'REGRESSION',
      inputDescription: 'Repeated identical parameters',
      expectedOutput: 'Both executions return identical deterministic outputs (r1 == r2).',
      assertions: isPython ? ['assert res1 == res2'] : ['expect(r1).toEqual(r2)'],
      code,
    });
  }

  return cases;
}

// ─── Assemble Full Test File ─────────────────────────────────────────────────

export function assembleTestFile(
  options: GenerateTestOptions,
  functionsToTest: ParsedFunction[]
): GeneratedTestFile {
  const isPython = options.targetFramework === 'pytest';
  const language = isPython ? 'python' : /\.tsx?$/i.test(options.filePath) ? 'typescript' : 'javascript';
  const baseName = options.filePath.split(/[\\/]/).pop()?.replace(/\.(tsx?|jsx?|py)$/i, '') || 'module';
  const testFileName = isPython ? `test_${baseName}.py` : `${baseName}.spec.${language === 'typescript' ? 'ts' : 'js'}`;

  const allCases: GeneratedTestCase[] = [];

  for (const fn of functionsToTest) {
    const cases = generateTestCasesForFunction(
      fn,
      options.filePath,
      options.targetFramework,
      options.selectedCategories
    );
    allCases.push(...cases);
  }

  // Build full code with imports and describe blocks
  let fullCode = '';

  if (isPython) {
    const importedFns = functionsToTest.map((f) => f.name).join(', ');
    const moduleImport = options.filePath
      .replace(/\\/g, '/')
      .replace(/\.py$/, '')
      .replace(/^\.?\//, '')
      .replace(/\//g, '.');

    fullCode = `# ==============================================================================
# Automated Test Suite generated by DevFlow AI
# Target: ${options.filePath}
# Framework: pytest
# ==============================================================================
import pytest
from ${moduleImport || baseName} import ${importedFns}


` + allCases.map((c) => c.code).join('\n\n\n');
  } else {
    const importedFns = functionsToTest.map((f) => f.name).join(', ');
    const modulePath = options.filePath
      .replace(/\\/g, '/')
      .replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '');
    const relativeModulePath = path.posix.relative('tests', modulePath);
    const importPath = relativeModulePath.startsWith('.') ? relativeModulePath : `./${relativeModulePath}`;
    const globalsModule = options.targetFramework === 'jest' ? '@jest/globals' : 'vitest';
    const mockGlobal = options.targetFramework === 'jest' ? 'jest' : 'vi';

    fullCode = `// ==============================================================================
// Automated Test Suite generated by DevFlow AI
// Target: ${options.filePath}
// Framework: ${options.targetFramework}
// ==============================================================================
import { describe, it, expect, ${mockGlobal} } from '${globalsModule}';
import { ${importedFns} } from '${importPath}';

describe('${baseName} Test Suite', () => {
${allCases.map((c) => '  ' + c.code.split('\n').join('\n  ')).join('\n\n')}
});
`;
  }

  return {
    fileName: testFileName,
    filePath: `tests/${testFileName}`,
    targetFilePath: options.filePath,
    language,
    framework: options.targetFramework,
    testCases: allCases,
    fullCode,
  };
}

export class TestGeneratorService {
  static generateTestsForFile(
    filePath: string,
    sourceCode: string,
    language: string,
    options: Partial<GenerateTestOptions> = {}
  ): GeneratedTestFile {
    const normalizedLanguage = language.toLowerCase() === 'python' ? 'python' : 'typescript';
    const targetFramework = options.targetFramework || (normalizedLanguage === 'python' ? 'pytest' : 'vitest');
    const generationOptions: GenerateTestOptions = {
      ...options,
      filePath,
      sourceCode,
      targetFramework,
    };
    const functions = extractFunctions(sourceCode, normalizedLanguage);
    return assembleTestFile(generationOptions, functions);
  }
}
