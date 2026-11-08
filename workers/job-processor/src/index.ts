import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

console.log('[DevFlow Job Processor] Initializing BullMQ Worker Fleet...');

const webhookWorker = new Worker(
  'webhook-ingestion-queue',
  async (job: Job) => {
    console.log(`[Webhook Worker] Processing event: ${job.name} (ID: ${job.id})`);
    // Workflow logic executed here in Phase 3
    return { status: 'processed', jobId: job.id };
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

webhookWorker.on('completed', (job: Job) => {
  console.log(`[Webhook Worker] Job ${job.id} completed successfully.`);
});

webhookWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Webhook Worker] Job ${job?.id} failed with error:`, err);
});

console.log('[DevFlow Job Processor] Worker Fleet listening for jobs.');
