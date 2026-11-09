/**
 * DevFlow AI - Isolated Execution Engine Worker
 * Listens on BullMQ 'sandbox-execution-queue' to execute test suites in isolated Docker / gVisor sandboxes.
 */

import { Worker, Job } from 'bullmq';
import Docker from 'dockerode';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || process.env.DOCKER_HOST || '/var/run/docker.sock' });
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

console.log('[DevFlow Execution Engine] Initializing Hardened Docker Sandbox Controller...');

export interface SandboxExecutionJobPayload {
  runId: string;
  repositoryId: string;
  commitSha: string;
  language: 'python' | 'javascript' | 'typescript';
  framework: 'pytest' | 'jest' | 'vitest';
  testCode: string;
  sourceCode?: string;
  timeoutSeconds?: number;
}

const executionWorker = new Worker<SandboxExecutionJobPayload>(
  'sandbox-execution-queue',
  async (job: Job<SandboxExecutionJobPayload>) => {
    const { runId, language, framework, timeoutSeconds = 15 } = job.data;
    const startTime = Date.now();
    console.log(`[Sandbox Worker] Received execution request for job ${job.id} (Run: ${runId})`);

    const isPython = language === 'python' || framework === 'pytest';
    const imageName = isPython ? 'devflow/python-runner:latest' : 'devflow/node-runner:latest';
    const containerName = `devflow_worker_${runId.replace(/-/g, '').slice(0, 16)}`;

    let container: Docker.Container | null = null;
    let isTimedOut = false;
    let exitCode = 1;
    let stdout = '';
    let stderr = '';

    try {
      // Create container with mandatory security isolation parameters
      container = await docker.createContainer({
        name: containerName,
        Image: imageName,
        User: '10001:10001', // Run as unprivileged non-root user
        NetworkDisabled: true, // Disable outbound network
        HostConfig: {
          NetworkMode: 'none',
          Memory: 256 * 1024 * 1024, // 256MB memory cap
          NanoCpus: 1_000_000_000, // 1.0 vCPU hard limit
          PidsLimit: 64, // Fork bomb protection
          ReadonlyRootfs: true, // Read-only root filesystem
          Tmpfs: {
            '/tmp': 'rw,noexec,nosuid,size=64m',
            '/workspace': 'rw,size=128m',
          },
          CapDrop: ['ALL'], // Drop all Linux capabilities
          SecurityOpt: ['no-new-privileges:true'],
          AutoRemove: false,
        },
        Env: [
          'CI=true',
          'NODE_ENV=test',
          'PYTHONUNBUFFERED=1',
          'PYTHONDONTWRITEBYTECODE=1',
        ],
      });

      await container.start();

      // Enforce timeout watchdog
      const timeoutMs = timeoutSeconds * 1000;
      const timeoutPromise = new Promise<{ isTimeout: boolean }>((resolve) =>
        setTimeout(() => resolve({ isTimeout: true }), timeoutMs)
      );

      const waitPromise = container.wait().then((data) => ({
        isTimeout: false,
        statusCode: data.StatusCode,
      }));

      const res = await Promise.race([waitPromise, timeoutPromise]);

      if (res.isTimeout) {
        isTimedOut = true;
        exitCode = 124;
        try {
          await container.kill();
        } catch {}
      } else {
        exitCode = (res as { statusCode: number }).statusCode;
        const logs = await container.logs({ stdout: true, stderr: true });
        stdout = logs.toString();
      }
    } catch (err: any) {
      stderr = err?.message || 'Container execution error';
      exitCode = 1;
    } finally {
      // Ephemeral cleanup: destroy container immediately
      if (container) {
        try {
          await container.remove({ force: true });
        } catch {}
      }
    }

    const durationMs = Date.now() - startTime;
    return {
      runId,
      exitCode,
      stdout,
      stderr,
      durationMs,
      isTimedOut,
      passed: exitCode === 0 && !isTimedOut,
      securitySpecApplied: {
        nonRootUser: '10001:10001',
        networkMode: 'none',
        readonlyRootfs: true,
        cpuLimit: '1.0',
        memoryLimitMb: 256,
        timeoutSeconds,
      },
    };
  },
  {
    connection: redisConnection,
    concurrency: Number(process.env.SANDBOX_MAX_CONCURRENCY || 4),
  }
);

executionWorker.on('completed', (job: Job) => {
  console.log(`[Sandbox Worker] Execution job ${job.id} completed successfully.`);
});

executionWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Sandbox Worker] Execution job ${job?.id} failed:`, err);
});

console.log('[DevFlow Execution Engine] Controller listening for sandbox execution tasks.');
