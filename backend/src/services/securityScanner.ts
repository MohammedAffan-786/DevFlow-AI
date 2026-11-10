import crypto from 'crypto';
import { Finding, SeverityLevel, FindingCategory, EvidenceStatus } from '@devflow/shared';
import { FileScanner, ScannedFile, DependencyAuditFinding } from './fileScanner';

interface SecurityRule {
  id: string;
  name: string;
  category: FindingCategory;
  severity: SeverityLevel;
  cweId: string;
  owaspCategory: string;
  pattern: RegExp;
  description: string;
  explanation: string;
  whyItMatters: string;
  suggestedFix: string;
  confidenceScore: number;
  evidenceStatus: EvidenceStatus;
  generateFix: (matchedSnippet: string) => string;
}

export class SecurityScanner {
  // Pre-compiled deterministic security detection rules
  private static rules: SecurityRule[] = [
    // 1. Hardcoded AWS Access Key
    {
      id: 'SEC-AWS-KEY',
      name: 'Hardcoded AWS Access Key Identified',
      category: 'SECURITY',
      severity: 'CRITICAL',
      cweId: 'CWE-798',
      owaspCategory: 'A07:2021-Identification-and-Authentication-Failures',
      pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/,
      description: 'AWS programmatic access key discovered in source code.',
      explanation: 'Hardcoded cloud credentials in version control can be scraped by automated bots, compromising infrastructure and cloud assets.',
      whyItMatters: 'Compromised AWS credentials can lead to complete tenant infrastructure takeover, data exfiltration, and significant financial liability.',
      suggestedFix: 'Extract credentials into secure environment variables or AWS Secrets Manager and revoke the exposed key immediately.',
      confidenceScore: 0.99,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => 'const awsKey = process.env.AWS_ACCESS_KEY_ID;',
    },

    // 2. Hardcoded Stripe Live Secret Key
    {
      id: 'SEC-STRIPE-KEY',
      name: 'Hardcoded Stripe Live Secret Key Discovered',
      category: 'SECURITY',
      severity: 'CRITICAL',
      cweId: 'CWE-798',
      owaspCategory: 'A07:2021-Identification-and-Authentication-Failures',
      pattern: /sk_live_[0-9a-zA-Z]{24,34}/,
      description: 'Production payment gateway secret key embedded in source files.',
      explanation: 'Storing live payment credentials allows unauthorized API consumers to issue unauthorized refunds, drain accounts, or access PCI customer records.',
      whyItMatters: 'Exposed payment credentials directly violate PCI-DSS compliance regulations and allow financial theft.',
      suggestedFix: 'Migrate secret key to encrypted environment storage and rotate the exposed token on Stripe Dashboard.',
      confidenceScore: 0.99,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => 'const stripeKey = process.env.STRIPE_SECRET_KEY;',
    },

    // 3. Private Cryptographic Key File / Block
    {
      id: 'SEC-PRIVATE-KEY',
      name: 'Exposed Private Cryptographic Key Block',
      category: 'SECURITY',
      severity: 'CRITICAL',
      cweId: 'CWE-312',
      owaspCategory: 'A02:2021-Cryptographic-Failures',
      pattern: /-----BEGIN(?: [A-Z0-9_-]+)? PRIVATE KEY-----/,
      description: 'Asymmetric private key (RSA/DSA/EC) committed to repository.',
      explanation: 'Private keys should never be committed into repositories, as git history preserves them even if deleted in future commits.',
      whyItMatters: 'Adversaries possessing private keys can impersonate services, decrypt TLS sessions, and forge cryptographic signatures.',
      suggestedFix: 'Store the key in a hardware security module (HSM), KMS, or encrypted secrets manager.',
      confidenceScore: 0.98,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => 'const privateKey = Buffer.from(process.env.APP_PRIVATE_KEY_BASE64, "base64").toString("utf8");',
    },

    // 4. SQL Injection via Dynamic String Concatenation
    {
      id: 'SEC-SQLI-INTERPOLATION',
      name: 'SQL Injection via Template String Interpolation',
      category: 'SECURITY',
      severity: 'HIGH',
      cweId: 'CWE-89',
      owaspCategory: 'A03:2021-Injection',
      pattern: /(?:\.query|\.raw|\.execute)\s*\(\s*`[^`]*\${[^}]+}[^`]*`\s*\)/,
      description: 'Dynamic SQL query constructed using unescaped string interpolation.',
      explanation: 'Embedding variables directly into SQL statements allows untrusted inputs to modify query syntax, bypassing authorization filters.',
      whyItMatters: 'Attackers can dump entire databases, modify transactional records, or execute arbitrary database commands.',
      suggestedFix: 'Replace string template interpolation with parameterized prepared statements or ORM query builders.',
      confidenceScore: 0.95,
      evidenceStatus: 'CONFIRMED',
      generateFix: (snippet) => {
        return snippet.replace(/`([^`]*)\${([^}]+)}([^`]*)`/, "'$1$1', [$2]");
      },
    },

    // 5. Cross-Site Scripting (XSS) via dangerouslySetInnerHTML
    {
      id: 'SEC-XSS-DANGEROUS-HTML',
      name: 'Potential Stored / Reflected XSS via Unescaped HTML',
      category: 'SECURITY',
      severity: 'HIGH',
      cweId: 'CWE-79',
      owaspCategory: 'A03:2021-Injection',
      pattern: /dangerouslySetInnerHTML\s*=\s*{\s*{\s*__html\s*:\s*[^}]+\s*}\s*}/,
      description: 'Rendering unescaped HTML content directly into the DOM.',
      explanation: 'Bypassing React HTML entity escaping exposes user sessions to Cross-Site Scripting if input contains malicious script tags or event handlers.',
      whyItMatters: 'XSS enables session token theft, DOM manipulation, credential harvesting, and cross-user impersonation.',
      suggestedFix: 'Sanitize untrusted HTML inputs with DOMPurify or render sanitized text content instead.',
      confidenceScore: 0.90,
      evidenceStatus: 'SUSPECTED',
      generateFix: () => 'dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}',
    },

    // 6. Command Injection via child_process
    {
      id: 'SEC-CMD-INJECTION',
      name: 'Command Injection Risk in Child Process Execution',
      category: 'SECURITY',
      severity: 'CRITICAL',
      cweId: 'CWE-78',
      owaspCategory: 'A03:2021-Injection',
      pattern: /(?:exec|execSync)\s*\(\s*`[^`]*\${[^}]+}[^`]*`\s*\)/,
      description: 'System command executed with unvalidated dynamic string parameters.',
      explanation: 'Executing shell commands with string interpolation allows shell meta-characters (`;`, `&&`, `|`) to execute unintended host commands.',
      whyItMatters: 'Remote Code Execution (RCE) allows complete compromise of the underlying application container or host system.',
      suggestedFix: 'Use `execFile` or `spawn` with an array of arguments rather than shell string execution.',
      confidenceScore: 0.96,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => 'execFile("executable", [param1, param2], options);',
    },

    // 7. Path Traversal / Arbitrary File Reading
    {
      id: 'SEC-PATH-TRAVERSAL',
      name: 'Path Traversal in File Operations',
      category: 'SECURITY',
      severity: 'HIGH',
      cweId: 'CWE-22',
      owaspCategory: 'A01:2021-Broken-Access-Control',
      pattern: /(?:readFile|readFileSync|createReadStream)\s*\(\s*(?:path\.join\([^)]*req\.[^)]*\)|req\.params\.[^)]*|req\.query\.[^)]*)/,
      description: 'File system operation utilizing unvalidated user-supplied path components.',
      explanation: 'Concatenating user inputs into filesystem paths without validating against `..` dot-dot-slash allows attackers to traverse outside intended root directories.',
      whyItMatters: 'Attackers can read sensitive host files such as `/etc/passwd`, environment variables, or secret certificates.',
      suggestedFix: 'Resolve the canonical path with `path.resolve` and verify it starts with the permitted base directory prefix.',
      confidenceScore: 0.92,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => 'const safePath = path.resolve(BASE_DIR, userPath);\nif (!safePath.startsWith(BASE_DIR)) throw new ForbiddenError();',
    },

    // 8. Weak Cryptographic Hash (MD5 / SHA1)
    {
      id: 'SEC-WEAK-HASH',
      name: 'Cryptographically Weak Hash Algorithm (MD5/SHA1)',
      category: 'SECURITY',
      severity: 'MEDIUM',
      cweId: 'CWE-327',
      owaspCategory: 'A02:2021-Cryptographic-Failures',
      pattern: /createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/i,
      description: 'Use of obsolete cryptographic hashing algorithms vulnerable to collision attacks.',
      explanation: 'MD5 and SHA-1 have known collision vulnerabilities and should not be used for security-sensitive hashing, signatures, or password verification.',
      whyItMatters: 'Adversaries can craft colliding inputs that produce identical hashes, breaking signature validation and integrity checks.',
      suggestedFix: 'Upgrade hashing algorithm to SHA-256 (`sha256`) or SHA-512, or use Argon2/scrypt for passwords.',
      confidenceScore: 0.95,
      evidenceStatus: 'CONFIRMED',
      generateFix: () => 'crypto.createHash("sha256")',
    },
  ];

  // Scan a single file content against deterministic rules
  static scanFile(file: ScannedFile): Finding[] {
    const findings: Finding[] = [];
    const lines = file.content.split('\n');

    for (const rule of this.rules) {
      const match = rule.pattern.exec(file.content);
      if (match) {
        // Calculate physical line numbers (1-indexed)
        const matchIndex = match.index;
        const textBefore = file.content.substring(0, matchIndex);
        const startLine = textBefore.split('\n').length;
        const matchedLinesCount = match[0].split('\n').length;
        const endLine = Math.min(lines.length, startLine + matchedLinesCount - 1);

        // Verify that line numbers are physically accurate in file
        const snippetLines = lines.slice(Math.max(0, startLine - 1), endLine);
        const physicalSnippet = snippetLines.join('\n');

        // Mask secrets in description & snippet for safety
        const maskedSnippet = physicalSnippet.replace(
          /(AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{10})[0-9a-zA-Z]+/g,
          '$1****************'
        );

        findings.push({
          findingId: `sec_${crypto.randomUUID().substring(0, 8)}`,
          filePath: file.path,
          startLine,
          endLine,
          severity: rule.severity,
          category: rule.category,
          description: rule.description,
          explanation: rule.explanation,
          whyItMatters: rule.whyItMatters,
          suggestedFix: rule.suggestedFix,
          correctedCodeExample: rule.generateFix(match[0]),
          confidenceScore: rule.confidenceScore,
          evidenceStatus: rule.evidenceStatus,
          cweId: rule.cweId,
          owaspCategory: rule.owaspCategory,
        });
      }
    }

    return findings;
  }

  // Convert dependency manifest CVEs into standard Security Findings
  static fromManifestFindings(manifestFindings: DependencyAuditFinding[]): Finding[] {
    return manifestFindings.map((dep) => ({
      findingId: `cve_${crypto.randomUUID().substring(0, 8)}`,
      filePath: dep.packageName.includes('@') ? 'package.json' : 'package.json / requirements.txt',
      startLine: 1,
      endLine: 1,
      severity: dep.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      category: 'SECURITY',
      description: `Vulnerable dependency: ${dep.packageName} (${dep.currentVersion} < ${dep.fixedVersion})`,
      explanation: `${dep.packageName} version ${dep.currentVersion} contains known security flaw ${dep.cveId}: ${dep.description}.`,
      whyItMatters: 'Using libraries with published CVEs exposes applications to automated reconnaissance and exploitation.',
      suggestedFix: `Upgrade ${dep.packageName} to version ${dep.fixedVersion} or higher in manifest.`,
      correctedCodeExample: `"${dep.packageName}": "^${dep.fixedVersion}"`,
      confidenceScore: 0.99,
      evidenceStatus: 'CONFIRMED',
      cweId: 'CWE-1395',
      owaspCategory: 'A06:2021-Vulnerable-and-Outdated-Components',
    }));
  }

  static scanFiles(files: unknown[]): Finding[] {
    return files.flatMap((file) => {
      const scannedFile = toScannedFile(file);
      return scannedFile ? this.scanFile(scannedFile) : [];
    });
  }
}

function toScannedFile(value: unknown): ScannedFile | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('path' in value) ||
    typeof value.path !== 'string' ||
    !('content' in value) ||
    typeof value.content !== 'string'
  ) {
    return undefined;
  }

  const content = value.content;
  return {
    path: value.path,
    name: value.path.split('/').pop() || '',
    content,
    language: FileScanner.detectLanguage(value.path),
    sizeBytes: Buffer.byteLength(content, 'utf8'),
    lineCount: content ? content.split('\n').length : 1,
  };
}

export function scanFile(filePath: string, content: string): Finding[] {
  return SecurityScanner.scanFile({
    path: filePath,
    name: filePath.split('/').pop() || '',
    content,
    language: FileScanner.detectLanguage(filePath),
    sizeBytes: Buffer.byteLength(content, 'utf8'),
    lineCount: content ? content.split('\n').length : 1,
  });
}

export function fromManifestFindings(manifestFindings: DependencyAuditFinding[]): Finding[] {
  return SecurityScanner.fromManifestFindings(manifestFindings);
}
