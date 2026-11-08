import crypto from 'crypto';
import { TokenUtils } from '../src/services/tokenUtils.ts';

export async function runAuthTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  // Helper for scrypt hashing
  function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  function verifyPassword(password: string, combinedHash: string): boolean {
    const parts = combinedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  // Test 1: Password Hashing & Constant-time Scrypt Verification
  try {
    const password = 'SuperSecretDevSecOpsPassword123!';
    const hash = hashPassword(password);

    if (!hash || !hash.includes(':')) {
      throw new Error('Hash format must include salt and key separated by colon');
    }

    const isValid = verifyPassword(password, hash);
    if (!isValid) {
      throw new Error('Valid password failed verification');
    }

    const isInvalid = verifyPassword('WrongPassword123!', hash);
    if (isInvalid) {
      throw new Error('Wrong password erroneously verified as valid');
    }

    results.push({ name: 'Authentication: Password hashing & constant-time scrypt verification', passed: true });
  } catch (err: any) {
    results.push({ name: 'Authentication: Password hashing & constant-time scrypt verification', passed: false, error: err.message });
  }

  // Test 2: JWT Access Token Generation and Verification
  try {
    const secret = 'super_secret_signing_key_at_least_32_bytes_long!';
    const mockPayload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'security.lead@acme.com',
      role: 'USER',
    };

    const token = TokenUtils.sign(mockPayload, secret, 900); // 15 min
    if (!token) throw new Error('Failed generating access token');

    const verified = TokenUtils.verify(token, secret);
    if (!verified || verified.userId !== mockPayload.userId || verified.email !== mockPayload.email) {
      throw new Error('Access token payload mismatch or verification failure');
    }

    // Tampered token check
    const tamperedToken = token.slice(0, -5) + 'abcde';
    const tamperedPayload = TokenUtils.verify(tamperedToken, secret);
    if (tamperedPayload !== null) {
      throw new Error('Tampered token was accepted as valid');
    }

    results.push({ name: 'Authentication: Access token signing, payload integrity & tamper rejection', passed: true });
  } catch (err: any) {
    results.push({ name: 'Authentication: Access token signing, payload integrity & tamper rejection', passed: false, error: err.message });
  }

  // Test 3: Refresh Token Verification
  try {
    const refreshSecret = 'super_secret_refresh_key_at_least_32_bytes_long!';
    const mockPayload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'security.lead@acme.com',
      role: 'USER',
    };

    const refreshToken = TokenUtils.sign(mockPayload, refreshSecret, 7 * 86400);
    const refreshPayload = TokenUtils.verify(refreshToken, refreshSecret);

    if (!refreshPayload || refreshPayload.userId !== mockPayload.userId) {
      throw new Error('Refresh token verification failed');
    }

    results.push({ name: 'Authentication: Refresh token creation and cryptographic validation', passed: true });
  } catch (err: any) {
    results.push({ name: 'Authentication: Refresh token creation and cryptographic validation', passed: false, error: err.message });
  }

  return results;
}
