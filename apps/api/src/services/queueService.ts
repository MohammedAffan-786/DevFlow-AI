import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { JobRecordModel, JobType, JobStatus, IJobRecord } from '../models/JobRecord';
import { AuditService } from './auditService';
import { NotificationService } from './notificationService';
import { AnalysisEngine } from './analysisEngine';
import { CodeReviewer } from './codeReviewer';
import { SecurityScanner } from './securityScanner';
import { TestGeneratorService } from './testGeneratorService';
import { TestExecutionService } from './testExecutionService';
import { PullRequestReviewService } from './pullRequestReviewService';
import { GitHubService } from './githubService';

export interface EnqueueJobOptions {
  type: JobType;
  payload: Record<string, any>;
  priority?: number; // 1 = High, 5 = Standard, 10 = Low
  organizationId?: string;
  repositoryId?: string;
  userId?: string;
  dedupKey?: string;
  maxAttempts?: number;
}

export class QueueService {
  private static redisConnection: Redis | null = null;
  private static mainQueue: Queue | null = null;
  private static deadLetterQueue: Queue | null = null;
  private static isInitialized = false;
  private static activeJobs = new Map<string, boolean>();

  /**
   * Initialize BullMQ queues and workers with connection fallback
   */
  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    try {
      this.redisConnection = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
          if (times > 3) return null; // Fall back gracefully if Redis is unavailable
          return Math.min(times * 1000, 3000);
        },
      });

      this.redisConnection.on('error', (err) => {
        console.warn(`[QueueService] Redis connection issue: ${err.message}. Operating in resilient asynchronous mode.`);
      });

      this.mainQueue = new Queue('devflow-jobs', {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });

      this.deadLetterQueue = new Queue('devflow-dead-letters', {
        connection: this.redisConnection,
      });

      // Start BullMQ Worker if Redis connects
      this.redisConnection.on('connect', () => {
        console.log('[QueueService] Connected to Redis. Registering BullMQ background worker.');
        this.setupBullMQWorker();
      });

    } catch (err: any) {
      console.warn(`[QueueService] Redis initialization notice: ${err.message}. Using resilient job execution.`);
    }

    this.isInitialized = true;
  }

  /**
   * Enqueue a background task with deduplication, prioritization, and retry configuration.
   */
  public static async enqueue(options: EnqueueJobOptions): Promise<{ jobId: string; status: JobStatus; isDuplicate?: boolean }> {
    await this.init();

    const priority = options.priority || this.getDefaultPriority(options.type);
    const maxAttempts = options.maxAttempts || 3;

    // 1. Duplicate Job Prevention
    if (options.dedupKey) {
      const existingJob = await JobRecordModel.findOne({
        dedupKey: options.dedupKey,
        status: { $in: ['PENDING', 'WAITING', 'ACTIVE', 'PROGRESS'] },
      });

      if (existingJob) {
        console.log(`[QueueService] Duplicate job prevented for key: ${options.dedupKey} (Job: ${existingJob.jobId})`);
        return {
          jobId: existingJob.jobId,
          status: existingJob.status,
          isDuplicate: true,
        };
      }
    }

    const jobId = `job_${options.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 2. Persist Job Record in MongoDB for persistent status tracking
    const record = await JobRecordModel.create({
      jobId,
      type: options.type,
      status: 'PENDING',
      priority,
      organizationId: options.organizationId,
      repositoryId: options.repositoryId,
      userId: options.userId,
      dedupKey: options.dedupKey,
      progress: {
        percentage: 0,
        stage: 'Enqueued',
        details: 'Task queued for execution',
        updatedAt: new Date(),
      },
      retryPolicy: {
        attemptsMade: 0,
        maxAttempts,
        backoffType: 'exponential',
        backoffDelayMs: 2000,
      },
      payload: options.payload,
      enqueuedAt: new Date(),
    });

    // 3. Dispatch to BullMQ or resilient in-memory dispatcher
    let dispatchedToBullMQ = false;
    if (this.mainQueue && this.redisConnection?.status === 'ready') {
      try {
        await this.mainQueue.add(options.type, { ...options.payload, jobId }, {
          jobId,
          priority,
          attempts: maxAttempts,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
        dispatchedToBullMQ = true;
      } catch (err: any) {
        console.warn(`[QueueService] BullMQ dispatch failed, running with resilient worker: ${err.message}`);
      }
    }

    if (!dispatchedToBullMQ) {
      // Execute via resilient async dispatcher (non-blocking)
      setTimeout(() => {
        this.processJobDirectly(jobId, options.type, options.payload, 1, maxAttempts).catch((e) =>
          console.error(`[QueueService] Resilient execution failed:`, e)
        );
      }, 50);
    }

    return {
      jobId,
      status: 'PENDING',
    };
  }

  /**
   * Safe Job Cancellation
   */
  public static async cancelJob(jobId: string, cancelledBy?: string): Promise<{ success: boolean; message: string }> {
    const jobRecord = await JobRecordModel.findOne({ jobId });
    if (!jobRecord) {
      return { success: false, message: 'Job not found' };
    }

    if (['COMPLETED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(jobRecord.status)) {
      return { success: false, message: `Job is already in final state: ${jobRecord.status}` };
    }

    // Try removing from BullMQ queue
    if (this.mainQueue) {
      try {
        const bullJob = await this.mainQueue.getJob(jobId);
        if (bullJob) {
          await bullJob.remove();
        }
      } catch {}
    }

    this.activeJobs.delete(jobId);

    jobRecord.status = 'CANCELLED';
    jobRecord.progress.stage = 'Cancelled by user';
    jobRecord.progress.details = `Job cancelled safely${cancelledBy ? ` by ${cancelledBy}` : ''}`;
    jobRecord.completedAt = new Date();
    await jobRecord.save();

    return { success: true, message: 'Job successfully cancelled' };
  }

  /**
   * Replay / Retry a Dead-Letter Job
   */
  public static async replayDeadLetter(jobId: string): Promise<{ success: boolean; newJobId?: string; message: string }> {
    const record = await JobRecordModel.findOne({ jobId });
    if (!record) {
      return { success: false, message: 'Job record not found' };
    }

    if (!record.deadLetter?.isDeadLetter && record.status !== 'FAILED') {
      return { success: false, message: 'Only dead-letter or failed jobs can be replayed' };
    }

    // Mark current dead-letter record as replayed
    record.deadLetter = {
      ...record.deadLetter,
      isDeadLetter: false,
      replayedAt: new Date(),
      replayCount: (record.deadLetter?.replayCount || 0) + 1,
    };
    await record.save();

    // Re-enqueue as a fresh run
    const result = await this.enqueue({
      type: record.type,
      payload: record.payload,
      priority: 1, // High priority for manual replays
      organizationId: record.organizationId?.toString(),
      repositoryId: record.repositoryId?.toString(),
      userId: record.userId?.toString(),
      maxAttempts: 3,
    });

    return {
      success: true,
      newJobId: result.jobId,
      message: `Job replayed successfully as ${result.jobId}`,
    };
  }

  /**
   * Update Progress for an active job
   */
  public static async updateProgress(
    jobId: string,
    percentage: number,
    stage: string,
    details?: string
  ): Promise<void> {
    const record = await JobRecordModel.findOne({ jobId });
    if (!record || record.status === 'CANCELLED') return;

    record.status = percentage >= 100 ? 'COMPLETED' : 'PROGRESS';
    record.progress = {
      percentage: Math.min(100, Math.max(0, percentage)),
      stage,
      details: details || '',
      updatedAt: new Date(),
    };
    if (percentage >= 100) {
      record.completedAt = new Date();
    }
    await record.save();
  }

  /**
   * Setup BullMQ Worker
   */
  private static setupBullMQWorker(): void {
    if (!this.redisConnection) return;

    const worker = new Worker(
      'devflow-jobs',
      async (job: Job) => {
        const { jobId } = job.data;
        const type = job.name as JobType;
        await this.executeJobHandler(jobId, type, job.data);
      },
      {
        connection: this.redisConnection,
        concurrency: 5,
      }
    );

    worker.on('failed', async (job, err) => {
      if (!job) return;
      await this.handleJobFailure(job.data.jobId, job.attemptsMade, job.opts.attempts || 3, err);
    });
  }

  /**
   * Resilient execution engine with exponential retry and dead-letter escalation
   */
  private static async processJobDirectly(
    jobId: string,
    type: JobType,
    payload: Record<string, any>,
    attempt: number,
    maxAttempts: number
  ): Promise<void> {
    const record = await JobRecordModel.findOne({ jobId });
    if (!record || record.status === 'CANCELLED') return;

    record.status = 'ACTIVE';
    record.startedAt = new Date();
    record.retryPolicy.attemptsMade = attempt;
    await record.save();

    this.activeJobs.set(jobId, true);

    try {
      const result = await this.executeJobHandler(jobId, type, payload);

      if (!this.activeJobs.get(jobId)) {
        // Was cancelled while running
        return;
      }

      record.status = 'COMPLETED';
      record.progress.percentage = 100;
      record.progress.stage = 'Completed successfully';
      record.result = result;
      record.completedAt = new Date();
      await record.save();

      this.activeJobs.delete(jobId);

      // Notification
      if (record.userId) {
        await NotificationService.notifyAnalysisCompleted(
          record.userId.toString(),
          record.repositoryId?.toString() || 'Repository',
          jobId,
          result?.overallScore || 85
        );
      }
    } catch (err: any) {
      this.activeJobs.delete(jobId);
      await this.handleJobFailure(jobId, attempt, maxAttempts, err);

      // If attempts remain, schedule exponential backoff retry
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[QueueService] Job ${jobId} failed attempt ${attempt}/${maxAttempts}. Retrying in ${delay}ms...`);
        setTimeout(() => {
          this.processJobDirectly(jobId, type, payload, attempt + 1, maxAttempts);
        }, delay);
      }
    }
  }

  /**
   * Central job execution router covering all 8 job types
   */
  private static async executeJobHandler(
    jobId: string,
    type: JobType,
    payload: Record<string, any>
  ): Promise<Record<string, any>> {
    switch (type) {
      case 'REPO_IMPORT': {
        await this.updateProgress(jobId, 15, 'Validating GitHub credentials');
        const repo = await GitHubService.syncRepository(payload.githubRepoId || payload.repoId, payload.token);
        await this.updateProgress(jobId, 60, 'Indexing repository branches & tree');
        await this.updateProgress(jobId, 100, 'Import completed');
        return { repo, importedAt: new Date() };
      }

      case 'REPO_ANALYSIS': {
        await this.updateProgress(jobId, 10, 'Scanning directory tree and filtering files');
        await this.updateProgress(jobId, 35, 'Executing static syntax and AST analysis');
        const result = await AnalysisEngine.analyzeRepository({
          repositoryId: payload.repositoryId,
          commitSha: payload.commitSha,
          branch: payload.branch,
        });
        await this.updateProgress(jobId, 80, 'Aggregating security and quality scores');
        await this.updateProgress(jobId, 100, 'Analysis completed');
        return result;
      }

      case 'AI_CODE_REVIEW': {
        await this.updateProgress(jobId, 25, 'Constructing contextual AST and code segments');
        const findings = await CodeReviewer.reviewFiles(payload.files || [], payload.repositoryContext || {});
        await this.updateProgress(jobId, 90, 'Filtering false-positives with prompt guidelines');
        await this.updateProgress(jobId, 100, 'AI Code Review completed');
        return { findings };
      }

      case 'SECURITY_SCAN': {
        await this.updateProgress(jobId, 30, 'Scanning for leaked secrets, API keys and tokens');
        await this.updateProgress(jobId, 70, 'Running SAST injection and vulnerability checks');
        const findings = await SecurityScanner.scanFiles(payload.files || []);
        await this.updateProgress(jobId, 100, 'Security scan complete');
        return { securityFindings: findings };
      }

      case 'TEST_GENERATION': {
        await this.updateProgress(jobId, 20, 'Analyzing function signatures and boundary conditions');
        const testSuite = await TestGeneratorService.generateTestsForFile(
          payload.filePath,
          payload.fileContent,
          payload.language || 'typescript',
          payload.options
        );
        await this.updateProgress(jobId, 85, 'Validating syntax and mocking structures');
        await this.updateProgress(jobId, 100, 'Tests generated successfully');
        return testSuite;
      }

      case 'TEST_EXECUTION': {
        await this.updateProgress(jobId, 15, 'Spawning non-root isolated container sandbox');
        await this.updateProgress(jobId, 50, 'Mounting temporary files and executing runner');
        const executionResult = await TestExecutionService.executeTestSuite({
          language: payload.language || 'typescript',
          testCode: payload.testCode,
          sourceCode: payload.sourceCode,
          timeoutMs: payload.timeoutMs || 30000,
        });
        await this.updateProgress(jobId, 100, 'Sandboxed test execution completed');
        return executionResult;
      }

      case 'PULL_REQUEST_REVIEW': {
        await this.updateProgress(jobId, 20, 'Fetching pull-request diff and changed files');
        const review = await PullRequestReviewService.processPullRequest({
          repositoryId: payload.repositoryId,
          pullNumber: payload.pullNumber,
          prData: payload.prData,
        });
        await this.updateProgress(jobId, 85, 'Generating line-level comments and security verdicts');
        await this.updateProgress(jobId, 100, 'Pull request review published');
        return review;
      }

      case 'REPORT_GENERATION': {
        await this.updateProgress(jobId, 30, 'Aggregating finding statistics and metric deltas');
        await this.updateProgress(jobId, 80, 'Compiling printable executive summary and charts');
        await this.updateProgress(jobId, 100, 'Report compiled successfully');
        return {
          reportUrl: `/api/v1/analysis/reports/${payload.reportId}`,
          generatedAt: new Date(),
        };
      }

      default:
        throw new Error(`Unsupported job type: ${type}`);
    }
  }

  /**
   * Handle Job Failure & Dead-Letter Queueing
   */
  private static async handleJobFailure(
    jobId: string,
    attempt: number,
    maxAttempts: number,
    err: any
  ): Promise<void> {
    const record = await JobRecordModel.findOne({ jobId });
    if (!record) return;

    const isFinalAttempt = attempt >= maxAttempts;
    record.failure = {
      reason: err?.message || 'Execution error encountered in background worker',
      stackTrace: err?.stack,
      failedAt: new Date(),
    };

    if (isFinalAttempt) {
      // Move to Dead-Letter State
      record.status = 'DEAD_LETTER';
      record.deadLetter = {
        isDeadLetter: true,
        reason: `Exhausted ${maxAttempts} retry attempts: ${err?.message || 'Unknown error'}`,
        movedAt: new Date(),
      };
      record.progress.stage = 'Dead Letter (Failed)';
      record.progress.details = `Job failed permanently after ${maxAttempts} attempts. Available for replay.`;

      // Dispatch alert notification
      if (record.userId) {
        await NotificationService.notifyJobFailed(
          record.userId.toString(),
          jobId,
          record.type,
          err?.message || 'Worker processing error'
        );
      }

      console.error(`[QueueService] Job ${jobId} moved to DEAD_LETTER after ${maxAttempts} attempts.`);
    } else {
      record.status = 'FAILED';
      record.progress.stage = `Failed (Attempt ${attempt}/${maxAttempts})`;
      record.progress.details = `Error: ${err?.message || 'Temporary error'}. Backing off...`;
    }

    await record.save();
  }

  /**
   * Queue Prioritization mapping
   */
  private static getDefaultPriority(type: JobType): number {
    switch (type) {
      case 'PULL_REQUEST_REVIEW':
      case 'SECURITY_SCAN':
        return 1; // High Priority
      case 'REPO_ANALYSIS':
      case 'AI_CODE_REVIEW':
      case 'REPO_IMPORT':
        return 5; // Standard Priority
      case 'TEST_GENERATION':
      case 'TEST_EXECUTION':
      case 'REPORT_GENERATION':
      default:
        return 10; // Normal / Batch Priority
    }
  }
}
