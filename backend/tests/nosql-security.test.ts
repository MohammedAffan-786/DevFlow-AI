import { sanitizeObject, validateFilePath, validateExternalUrl } from '../src/middlewares/securitySanitizer.ts';

export async function runSecuritySanitizerTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  // Test 1: NoSQL Injection Sanitization
  try {
    const maliciousPayload = {
      username: 'legit_developer',
      password: { $gt: '' }, // NoSQL query operator injection
      nested: {
        safeField: 'hello',
        $where: 'sleep(5000)',
        'dotted.field': 'injection',
      },
      tags: ['normal', { $ne: null }],
    };

    const clean = sanitizeObject(maliciousPayload);

    if (clean.password && typeof clean.password === 'object' && '$gt' in clean.password) {
      throw new Error('Failed to sanitize $gt operator');
    }

    if (clean.nested && '$where' in clean.nested) {
      throw new Error('Failed to sanitize $where operator');
    }

    if (clean.nested && 'dotted.field' in clean.nested) {
      throw new Error('Failed to sanitize dotted field operator');
    }

    if (clean.username !== 'legit_developer' || clean.nested.safeField !== 'hello') {
      throw new Error('Legitimate fields were corrupted during sanitization');
    }

    results.push({ name: 'Security: NoSQL operator stripping & payload sanitization', passed: true });
  } catch (err: any) {
    results.push({ name: 'Security: NoSQL operator stripping & payload sanitization', passed: false, error: err.message });
  }

  // Test 2: Path Traversal Prevention
  try {
    const dangerousPaths = [
      '../../etc/passwd',
      '..\\..\\windows\\system32\\cmd.exe',
      '/var/run/secrets/kubernetes.io',
      'C:\\secrets.env',
      'src/%2e%2e/config.json',
      'src/handlers\0.ts',
    ];

    for (const p of dangerousPaths) {
      if (validateFilePath(p)) {
        throw new Error(`Dangerous path escaped validation: ${p}`);
      }
    }

    const safePaths = [
      'src/handlers/authHandler.ts',
      'package.json',
      'apps/api/src/server.ts',
    ];

    for (const p of safePaths) {
      if (!validateFilePath(p)) {
        throw new Error(`Legitimate path was falsely rejected: ${p}`);
      }
    }

    results.push({ name: 'Security: Path traversal and directory escape validation', passed: true });
  } catch (err: any) {
    results.push({ name: 'Security: Path traversal and directory escape validation', passed: false, error: err.message });
  }

  // Test 3: SSRF Protection
  try {
    const maliciousUrls = [
      'http://169.254.169.254/latest/meta-data/', // AWS metadata
      'http://metadata.google.internal/computeMetadata/v1/', // GCP metadata
      'http://localhost:8080/admin', // Localhost
      'http://127.0.0.1:27017', // Mongo loopback
      'http://10.0.0.1/internal-api', // RFC1918 10.x
      'http://192.168.1.1/router-login', // RFC1918 192.168.x
      'file:///etc/passwd', // File protocol
    ];

    for (const url of maliciousUrls) {
      const check = validateExternalUrl(url);
      if (check.isValid) {
        throw new Error(`SSRF validation failed to block dangerous URL: ${url}`);
      }
    }

    const safeUrls = [
      'https://github.com/torvalds/linux',
      'https://api.github.com/repos/acme/app',
    ];

    for (const url of safeUrls) {
      const check = validateExternalUrl(url);
      if (!check.isValid) {
        throw new Error(`Legitimate external URL was falsely blocked: ${url}`);
      }
    }

    results.push({ name: 'Security: SSRF validation & cloud-metadata endpoint defense', passed: true });
  } catch (err: any) {
    results.push({ name: 'Security: SSRF validation & cloud-metadata endpoint defense', passed: false, error: err.message });
  }

  return results;
}
