export * from '../services/cryptoUtils.js';
export * from '../services/tokenUtils.js';

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

export function truncateString(str: string, maxLen: number = 200): string {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}
