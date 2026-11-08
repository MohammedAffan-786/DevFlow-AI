import crypto from 'crypto';

/**
 * Validates GitHub X-Hub-Signature-256 header using timing-safe comparison.
 */
export function verifyWebhookSignature(
  rawPayload: string | Buffer,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;

  const expectedSignature = parts[1];
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawPayload);
  const calculatedSignature = hmac.digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf8');
  const calculatedBuf = Buffer.from(calculatedSignature, 'utf8');

  if (expectedBuf.length !== calculatedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, calculatedBuf);
}
