import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const memoryStore: RateLimitStore = {};

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    if (!memoryStore[key] || memoryStore[key].resetTime < now) {
      memoryStore[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    memoryStore[key].count += 1;

    if (memoryStore[key].count > max) {
      const retryAfterSec = Math.ceil((memoryStore[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);

      return res.status(429).contentType('application/problem+json').json({
        type: 'https://api.devflow.ai/errors/rate-limit-exceeded',
        title: 'Too Many Requests',
        status: 429,
        detail: message || `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
        instance: req.originalUrl,
      });
    }

    next();
  };
}
