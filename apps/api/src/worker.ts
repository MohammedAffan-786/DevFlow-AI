import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { QueueService } from './services/queueService';

dotenv.config();
dotenv.config({ path: '../../.env' });

async function startWorker(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI must be configured for the background job worker.');
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  await QueueService.init(true);
  console.log('[DevFlow Job Worker] Connected to MongoDB and initialized.');
}

async function stopWorker(signal: string): Promise<void> {
  console.log(`[DevFlow Job Worker] Received ${signal}; shutting down.`);
  try {
    await QueueService.close();
    await mongoose.disconnect();
  } catch (error) {
    console.error('[DevFlow Job Worker] Graceful shutdown failed:', error);
    process.exitCode = 1;
  }
}

process.once('SIGTERM', () => void stopWorker('SIGTERM'));
process.once('SIGINT', () => void stopWorker('SIGINT'));

startWorker().catch((error: unknown) => {
  console.error('[DevFlow Job Worker] Startup failed:', error);
  void (async () => {
    try {
      await QueueService.close();
    } catch (closeError) {
      console.error('[DevFlow Job Worker] Queue cleanup failed:', closeError);
    }
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('[DevFlow Job Worker] MongoDB cleanup failed:', disconnectError);
    }
    process.exitCode = 1;
  })();
});
