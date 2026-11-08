import path from 'path';
import { RepoFileNode } from '@devflow/shared';

export interface ScannedFile {
  path: string;
  name: string;
  content: string;
  language: string;
  sizeBytes: number;
  lineCount: number;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface DependencyAuditFinding {
  packageName: string;
  currentVersion: string;
  fixedVersion: string;
  cveId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
}

export interface ScanInventory {
  analyzedFiles: ScannedFile[];
  skippedFiles: SkippedFile[];
  languages: Array<{ language: string; byteCount: number; percentage: number; fileCount: number }>;
  manifestFindings: DependencyAuditFinding[];
}

const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200 KB per file
const MAX_REPO_FILES = 500; // Limit total files analyzed

// Directory and file exclusion patterns
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'vendor',
  '.venv',
  'venv',
  '__pycache__',
  '.next',
  'out',
  'coverage',
  '.turbo',
  '.idea',
  '.vscode',
]);

const IGNORED_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'ico',
  'pdf',
  'zip',
  'tar',
  'gz',
  'mp4',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'map',
]);

export class FileScanner {
  // Discovers, filters, and classifies repository files
  static processFileTree(
    rawFiles: Array<{ path: string; content?: string; size?: number }>
  ): ScanInventory {
    const analyzedFiles: ScannedFile[] = [];
    const skippedFiles: SkippedFile[] = [];
    const languageBytes: Record<string, { bytes: number; count: number }> = {};
    const manifestFindings: DependencyAuditFinding[] = [];

    let totalBytesAnalyzed = 0;

    for (const file of rawFiles) {
      if (analyzedFiles.length >= MAX_REPO_FILES) {
        skippedFiles.push({ path: file.path, reason: 'EXCEEDS_REPOSITORY_FILE_LIMIT' });
        continue;
      }

      // Check directory exclusion
      const parts = file.path.split('/');
      const isIgnoredDir = parts.some((part) => IGNORED_DIRECTORIES.has(part.toLowerCase()));
      if (isIgnoredDir) {
        skippedFiles.push({ path: file.path, reason: 'IGNORED_DIRECTORY' });
        continue;
      }

      // Check file extension exclusion
      const ext = file.path.split('.').pop()?.toLowerCase() || '';
      if (IGNORED_EXTENSIONS.has(ext)) {
        skippedFiles.push({ path: file.path, reason: 'BINARY_OR_MEDIA_ASSET' });
        continue;
      }

      // Check minified or lockfiles
      if (file.path.endsWith('.min.js') || file.path.endsWith('.min.css')) {
        skippedFiles.push({ path: file.path, reason: 'MINIFIED_FILE' });
        continue;
      }
      if (file.path.endsWith('package-lock.json') || file.path.endsWith('pnpm-lock.yaml') || file.path.endsWith('yarn.lock')) {
        skippedFiles.push({ path: file.path, reason: 'LOCKFILE_SKIPPED' });
        continue;
      }

      const content = file.content || '';
      const sizeBytes = file.size !== undefined ? file.size : Buffer.byteLength(content, 'utf8');

      // Check file size threshold
      if (sizeBytes > MAX_FILE_SIZE_BYTES) {
        skippedFiles.push({ path: file.path, reason: `EXCEEDS_FILE_SIZE_LIMIT (${Math.round(sizeBytes / 1024)}KB > 200KB)` });
        continue;
      }

      const language = this.detectLanguage(file.path);
      const lineCount = content ? content.split('\n').length : 1;

      // Inspect Dependency Manifests
      if (file.path === 'package.json') {
        const findings = this.auditPackageJson(content);
        manifestFindings.push(...findings);
      } else if (file.path === 'requirements.txt') {
        const findings = this.auditRequirementsTxt(content);
        manifestFindings.push(...findings);
      }

      analyzedFiles.push({
        path: file.path,
        name: file.path.split('/').pop() || '',
        content,
        language,
        sizeBytes,
        lineCount,
      });

      totalBytesAnalyzed += sizeBytes;
      if (!languageBytes[language]) {
        languageBytes[language] = { bytes: 0, count: 0 };
      }
      languageBytes[language].bytes += sizeBytes;
      languageBytes[language].count += 1;
    }

    // Compute language percentages
    const languages = Object.entries(languageBytes).map(([lang, stat]) => ({
      language: lang,
      byteCount: stat.bytes,
      percentage: totalBytesAnalyzed > 0 ? Math.round((stat.bytes / totalBytesAnalyzed) * 100) : 0,
      fileCount: stat.count,
    })).sort((a, b) => b.byteCount - a.byteCount);

    return {
      analyzedFiles,
      skippedFiles,
      languages,
      manifestFindings,
    };
  }

  // Audit package.json dependencies against known vulnerability database
  static auditPackageJson(content: string): DependencyAuditFinding[] {
    const findings: DependencyAuditFinding[] = [];
    try {
      const parsed = JSON.parse(content);
      const allDeps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };

      // Known vulnerable package catalog
      const vulnerableCatalog: Record<string, { fixed: string; cve: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'; desc: string }> = {
        'lodash': { fixed: '4.17.21', cve: 'CVE-2021-23337', severity: 'HIGH', desc: 'Command Injection via template function' },
        'axios': { fixed: '0.21.1', cve: 'CVE-2020-28168', severity: 'MEDIUM', desc: 'Server-Side Request Forgery (SSRF) bypass' },
        'json-schema': { fixed: '0.4.0', cve: 'CVE-2021-3918', severity: 'CRITICAL', desc: 'Prototype Pollution vulnerability' },
        'minimist': { fixed: '1.2.6', cve: 'CVE-2021-44906', severity: 'HIGH', desc: 'Prototype Pollution in argument parsing' },
      };

      for (const [pkg, version] of Object.entries(allDeps)) {
        const known = vulnerableCatalog[pkg];
        if (known) {
          const cleanVersion = String(version).replace(/[\^~>=<]/g, '');
          if (cleanVersion && cleanVersion < known.fixed) {
            findings.push({
              packageName: pkg,
              currentVersion: String(version),
              fixedVersion: known.fixed,
              cveId: known.cve,
              severity: known.severity,
              description: known.desc,
            });
          }
        }
      }
    } catch {
      // Ignore JSON parse errors in malformed manifests
    }
    return findings;
  }

  // Audit requirements.txt dependencies
  static auditRequirementsTxt(content: string): DependencyAuditFinding[] {
    const findings: DependencyAuditFinding[] = [];
    const lines = content.split('\n');

    const pythonVulns: Record<string, { fixed: string; cve: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'; desc: string }> = {
      'requests': { fixed: '2.31.0', cve: 'CVE-2023-32681', severity: 'MEDIUM', desc: 'Proxy-Authorization header leakage on HTTPS redirects' },
      'urllib3': { fixed: '1.26.18', cve: 'CVE-2023-45803', severity: 'HIGH', desc: 'HTTP Request Body Removal on redirect bypass' },
      'django': { fixed: '3.2.14', cve: 'CVE-2022-34265', severity: 'HIGH', desc: 'SQL Injection in Trunc() and Extract() database functions' },
    };

    for (const line of lines) {
      const match = line.trim().match(/^([a-zA-Z0-9_\-]+)\s*==\s*([0-9.]+)/);
      if (match) {
        const pkg = match[1].toLowerCase();
        const ver = match[2];
        const known = pythonVulns[pkg];
        if (known && ver < known.fixed) {
          findings.push({
            packageName: pkg,
            currentVersion: ver,
            fixedVersion: known.fixed,
            cveId: known.cve,
            severity: known.severity,
            description: known.desc,
          });
        }
      }
    }
    return findings;
  }

  static detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'TypeScript';
      case 'js':
      case 'jsx':
      case 'mjs':
        return 'JavaScript';
      case 'py':
        return 'Python';
      case 'go':
        return 'Go';
      case 'json':
        return 'JSON';
      case 'yml':
      case 'yaml':
        return 'YAML';
      case 'sql':
        return 'SQL';
      case 'dockerfile':
        return 'Dockerfile';
      default:
        if (filePath.toLowerCase().endsWith('dockerfile')) return 'Dockerfile';
        return 'Plain Text';
    }
  }
}
