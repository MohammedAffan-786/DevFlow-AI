import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { ProblemDetails } from '@devflow/shared';
import routes from './routes';
import { SeedService } from './services/seedService';
import { QueueService } from './services/queueService';
import { initializeDatabaseIndexes } from './scripts/initIndexes';
import { createRateLimiter } from './middlewares/rateLimiter';
import { noSqlSanitizer } from './middlewares/securitySanitizer';

dotenv.config();
// Workspace scripts run from apps/api; also load the monorepo root .env.
dotenv.config({ path: '../../.env' });

// Production Security Invariant Checks
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
    console.error('FATAL DEVSECOPS AUDIT: JWT_ACCESS_SECRET must be set and >= 32 characters in production.');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;
const isVercel = Boolean(process.env.VERCEL);

// Reverse Proxy Header Trust (for accurate client IP rate limiting behind ingress/ALB)
app.set('trust proxy', 1);

// Hardened Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://avatars.githubusercontent.com'],
        connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:5173'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      const configured = process.env.FRONTEND_URL;
      if (!origin) return callback(null, true);
      if (configured && origin === configured) return callback(null, origin);
      if (origin.endsWith('.vercel.app')) return callback(null, origin);
      if (origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173') {
        return callback(null, origin);
      }
      return callback(null, configured || 'http://localhost:5173');
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Organization-ID'],
    exposedHeaders: ['X-Correlation-ID'],
  })
);
app.use(cookieParser());
// Body payload limits strictly bounded to prevent DoS via memory exhaustion
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// NoSQL Injection Sanitization
app.use(noSqlSanitizer);

// Correlation ID Tracking Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  res.setHeader('X-Correlation-ID', correlationId);
  res.locals.correlationId = correlationId;
  next();
});

// Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url} - CorrelationID: ${res.locals.correlationId}`);
  next();
});

// Rate Limiters
const generalRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120 });
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

app.use('/api/v1/auth/login', authRateLimiter);
app.use('/api/v1/auth/register', authRateLimiter);
app.use('/api/v1', generalRateLimiter);

// Health Probes
app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'live', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const isMongoReady = mongoose.connection.readyState === 1;
  if (!isMongoReady) {
    return res.status(503).json({ status: 'unready', reason: 'Database connection offline' });
  }
  return res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
});

app.get('/health/metrics', (_req: Request, res: Response) => {
  const memory = process.memoryUsage();
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    process: {
      uptimeSeconds: Math.floor(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
    },
    memory: {
      rssBytes: memory.rss,
      heapTotalBytes: memory.heapTotal,
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external,
    },
    database: {
      connected: mongoose.connection.readyState === 1,
    },
  });
});

// Primary Versioned API Router
app.use('/api/v1', routes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).contentType('application/problem+json').json({
    type: 'https://api.devflow.ai/errors/route-not-found',
    title: 'Route Not Found',
    status: 404,
    detail: `Cannot ${req.method} ${req.originalUrl}`,
    instance: req.originalUrl,
  });
});

// RFC 7807 Global Error Handling Middleware
app.use(
  (
    err: Error & { status?: number; invalidParams?: Array<{ name: string; reason: string }> },
    req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    const status = err.status || 500;
    const problem: ProblemDetails = {
      type: `https://api.devflow.ai/errors/${status === 500 ? 'internal-error' : 'request-error'}`,
      title: err.name || 'Internal Server Error',
      status,
      detail: err.message || 'An unexpected error occurred while processing the request.',
      instance: req.originalUrl,
      correlationId: res.locals.correlationId,
      invalidParams: err.invalidParams,
    };

    console.error(`[DevFlow Error] ${req.method} ${req.originalUrl} failed:`, err);
    res.status(status).contentType('application/problem+json').json(problem);
  }
);

// Graceful Lifecycle Management & Auto-Seed
async function bootstrap() {
  try {
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/devflow?directConnection=true';
    console.log(`[DevFlow API] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':$1***@')}`);
    
    // Connect to MongoDB (handles both standalone & replicaSet seamlessly)
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 }).catch((err) => {
      console.warn(`[DevFlow API] Initial MongoDB connection warning: ${err.message}. Running in resilient mode.`);
    });

    if (mongoose.connection.readyState === 1) {
      console.log(`[DevFlow API] MongoDB Connected successfully.`);
      await SeedService.seedIfEmpty();
      await initializeDatabaseIndexes();
    } else {
      console.log(`[DevFlow API] Database offline or booting; API server will accept requests.`);
    }

    // Initialize BullMQ & Redis Queue Engine (skip on Vercel — no local Redis)
    if (!isVercel) {
      await QueueService.init().catch((err) => {
        console.warn(`[DevFlow API] QueueService initialization warning: ${err.message}`);
      });
    }

    if (isVercel) {
      console.log(`[DevFlow API] Vercel function ready (Environment: ${process.env.NODE_ENV || 'development'})`);
      return;
    }

    const server = app.listen(PORT, () => {
      console.log(`[DevFlow API] Server running on port ${PORT} (Environment: ${process.env.NODE_ENV || 'development'})`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`[DevFlow API] Received ${signal}. Commencing graceful teardown...`);
      server.close(async () => {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
        }
        console.log(`[DevFlow API] Connections closed. Exiting process.`);
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error(`[DevFlow API] Fatal bootstrap failure:`, error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export default app;
