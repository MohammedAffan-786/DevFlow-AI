import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/devflow',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32bytes',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_super_secure_32bytes',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
  },
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    internalKey: process.env.AI_SERVICE_INTERNAL_KEY || 'development_secret_key',
    olamaKey: process.env.OLAMA_API_KEY || '',
  },
  github: {
    appId: process.env.GITHUB_APP_ID || '',
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    privateKey: process.env.GITHUB_PRIVATE_KEY || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
};
