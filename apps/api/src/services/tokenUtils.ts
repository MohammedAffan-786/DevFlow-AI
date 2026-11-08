import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
  iat?: number;
}

/**
 * Standard RFC 7519 JWT implementation using native Node.js crypto.
 * Completely zero third-party dependencies, timing-safe and tamper-proof.
 */
export class TokenUtils {
  private static base64UrlEncode(str: string | Buffer): string {
    const base64 = typeof str === 'string' ? Buffer.from(str).toString('base64') : str.toString('base64');
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  private static base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  public static sign(payload: TokenPayload, secret: string, expiresInSeconds: number): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest();
    const encodedSignature = this.base64UrlEncode(signature);

    return `${dataToSign}.${encodedSignature}`;
  }

  public static verify(token: string, secret: string): TokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto.createHmac('sha256', secret).update(dataToSign).digest();
    const expectedEncodedSig = this.base64UrlEncode(expectedSignature);

    const sigBuf = Buffer.from(encodedSignature);
    const expectedBuf = Buffer.from(expectedEncodedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    try {
      const payload: TokenPayload = JSON.parse(this.base64UrlDecode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Expired
      }
      return payload;
    } catch {
      return null;
    }
  }
}
