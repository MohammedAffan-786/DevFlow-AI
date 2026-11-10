import Redis from 'ioredis';

export class CacheService {
  private static redis: Redis | null = null;
  private static memoryCache = new Map<string, { val: any; expiresAt: number }>();
  private static isInitialized = false;

  public static init() {
    if (this.isInitialized) return;

    try {
      const redisUrl = process.env.REDIS_URL;
      const redisOptions = {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Resilient fallback to memory cache if Redis offline
      };
      this.redis = redisUrl
        ? new Redis(redisUrl, redisOptions)
        : new Redis({
            ...redisOptions,
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
          });

      this.redis.connect().catch(() => {
        // Silent catch for resilient in-memory mode
      });
    } catch {
      // Memory fallback
    }

    this.isInitialized = true;
  }

  /**
   * Get cached object by key
   */
  public static async get<T>(key: string): Promise<T | null> {
    this.init();

    if (this.redis && this.redis.status === 'ready') {
      try {
        const raw = await this.redis.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch {}
    }

    // In-memory fallback
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.val as T;
  }

  /**
   * Set cached object with TTL in seconds
   */
  public static async set(key: string, val: any, ttlSeconds = 60): Promise<void> {
    this.init();

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(key, JSON.stringify(val), 'EX', ttlSeconds);
        return;
      } catch {}
    }

    // In-memory fallback
    this.memoryCache.set(key, {
      val,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate cached key or prefix
   */
  public static async del(key: string): Promise<void> {
    this.init();

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(key);
      } catch {}
    }

    this.memoryCache.delete(key);
  }
}
