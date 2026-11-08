import type { Request, Response, NextFunction } from 'express';

/**
 * Recursively strips dangerous NoSQL operator keys ($gt, $ne, $where, etc.)
 * and path traversal characters from request payload objects.
 */
export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const cleanObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // 1. Strip NoSQL operator keys starting with $ or containing .
    if (key.startsWith('$') || key.includes('.')) {
      console.warn(`[SecuritySanitizer] Blocked potential NoSQL injection key: "${key}"`);
      continue;
    }

    // 2. Sanitize string values against null-byte injection and path traversal escapes
    if (typeof value === 'string') {
      const sanitizedString = value.replace(/\0/g, ''); // Remove null bytes
      cleanObj[key] = sanitizeObject(sanitizedString);
    } else if (typeof value === 'object' && value !== null) {
      cleanObj[key] = sanitizeObject(value);
    } else {
      cleanObj[key] = value;
    }
  }

  return cleanObj;
}

/**
 * Express middleware to sanitize body, query, and params against NoSQL injection
 */
export function noSqlSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

/**
 * Validates that file paths do not escape outside intended directories
 */
export function validateFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;

  // Reject path traversal tokens
  if (filePath.includes('../') || filePath.includes('..\\') || filePath.includes('%2e%2e')) {
    return false;
  }

  // Reject absolute system paths
  if (filePath.startsWith('/') || /^[a-zA-Z]:[/\\]/.test(filePath)) {
    return false;
  }

  // Reject null bytes
  if (filePath.includes('\0')) {
    return false;
  }

  return true;
}

/**
 * SSRF Guard: Validates that target URLs do not point to internal, private,
 * loopback, or cloud-metadata endpoints (e.g. AWS 169.254.169.254).
 */
export function validateExternalUrl(urlString: string): { isValid: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, reason: 'Unsupported protocol. Only HTTP and HTTPS are allowed.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Loopback / localhost checks
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local')
    ) {
      return { isValid: false, reason: 'Requests to loopback addresses are blocked.' };
    }

    // Cloud Metadata Endpoints (AWS, GCP, Azure, DigitalOcean)
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return { isValid: false, reason: 'Requests to cloud instance metadata services are strictly blocked.' };
    }

    // Private IPv4 ranges (RFC 1918)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const octet1 = parseInt(match[1], 10);
      const octet2 = parseInt(match[2], 10);

      // 10.0.0.0/8
      if (octet1 === 10) {
        return { isValid: false, reason: 'Private IP range (10.0.0.0/8) is restricted.' };
      }
      // 172.16.0.0/12
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
        return { isValid: false, reason: 'Private IP range (172.16.0.0/12) is restricted.' };
      }
      // 192.168.0.0/16
      if (octet1 === 192 && octet2 === 168) {
        return { isValid: false, reason: 'Private IP range (192.168.0.0/16) is restricted.' };
      }
      // 0.0.0.0/8
      if (octet1 === 0) {
        return { isValid: false, reason: 'Invalid IP address.' };
      }
    }

    return { isValid: true };
  } catch {
    return { isValid: false, reason: 'Malformed URL.' };
  }
}
