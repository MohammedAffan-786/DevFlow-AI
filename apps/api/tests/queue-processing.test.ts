export interface TestJob {
  jobId: string;
  type: string;
  priority: number;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER' | 'CANCELLED';
  attempts: number;
  maxAttempts: number;
  dedupKey?: string;
  isDeadLetter?: boolean;
}

export class MockQueueEngine {
  private jobs = new Map<string, TestJob>();
  private dedupIndex = new Map<string, string>();

  public enqueue(type: string, payload: any, priority = 5, dedupKey?: string): { job: TestJob; isDuplicate: boolean } {
    if (dedupKey && this.dedupIndex.has(dedupKey)) {
      const existingId = this.dedupIndex.get(dedupKey)!;
      return { job: this.jobs.get(existingId)!, isDuplicate: true };
    }

    const jobId = `job_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const job: TestJob = {
      jobId,
      type,
      priority,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: 3,
      dedupKey,
    };

    this.jobs.set(jobId, job);
    if (dedupKey) this.dedupIndex.set(dedupKey, jobId);

    return { job, isDuplicate: false };
  }

  public cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || ['COMPLETED', 'FAILED', 'DEAD_LETTER'].includes(job.status)) {
      return false;
    }
    job.status = 'CANCELLED';
    return true;
  }

  public simulateFailure(jobId: string): { status: string; backoffMs: number; isDeadLetter: boolean } {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');

    job.attempts++;
    if (job.attempts >= job.maxAttempts) {
      job.status = 'DEAD_LETTER';
      job.isDeadLetter = true;
      return { status: 'DEAD_LETTER', backoffMs: 0, isDeadLetter: true };
    }

    job.status = 'FAILED';
    const backoffMs = Math.pow(2, job.attempts) * 1000;
    return { status: 'FAILED', backoffMs, isDeadLetter: false };
  }
}

export async function runQueueTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  const engine = new MockQueueEngine();

  // Test 1: Priority Queue Enqueue
  try {
    const { job: highJob } = engine.enqueue('SECURITY_SCAN', {}, 1);
    const { job: normalJob } = engine.enqueue('REPORT_GENERATION', {}, 10);

    if (highJob.priority !== 1 || normalJob.priority !== 10) {
      throw new Error('Priority levels improperly configured');
    }

    results.push({ name: 'Queue Processing: Enqueue background task with priority levels', passed: true });
  } catch (err: any) {
    results.push({ name: 'Queue Processing: Enqueue background task with priority levels', passed: false, error: err.message });
  }

  // Test 2: Idempotent Deduplication
  try {
    const dedupKey = 'repo_123_scan_latest';
    const first = engine.enqueue('REPO_ANALYSIS', {}, 5, dedupKey);
    const second = engine.enqueue('REPO_ANALYSIS', {}, 5, dedupKey);

    if (!second.isDuplicate || second.job.jobId !== first.job.jobId) {
      throw new Error('Duplicate task escaped deduplication index');
    }

    results.push({ name: 'Queue Processing: Deduplication and idempotent job dispatch', passed: true });
  } catch (err: any) {
    results.push({ name: 'Queue Processing: Deduplication and idempotent job dispatch', passed: false, error: err.message });
  }

  // Test 3: Exponential Backoff & Dead-Letter Escalation
  try {
    const { job } = engine.enqueue('TEST_EXECUTION', {}, 5);

    // Attempt 1: Should fail with 2s backoff
    const fail1 = engine.simulateFailure(job.jobId);
    if (fail1.status !== 'FAILED' || fail1.backoffMs !== 2000) {
      throw new Error(`Attempt 1 backoff calculation mismatch: ${fail1.backoffMs}ms`);
    }

    // Attempt 2: Should fail with 4s backoff
    const fail2 = engine.simulateFailure(job.jobId);
    if (fail2.status !== 'FAILED' || fail2.backoffMs !== 4000) {
      throw new Error(`Attempt 2 backoff calculation mismatch: ${fail2.backoffMs}ms`);
    }

    // Attempt 3: Exhausted maxAttempts -> DEAD_LETTER
    const fail3 = engine.simulateFailure(job.jobId);
    if (fail3.status !== 'DEAD_LETTER' || !fail3.isDeadLetter) {
      throw new Error('Job did not transition to DEAD_LETTER after 3 failed attempts');
    }

    results.push({ name: 'Queue Processing: Exponential backoff & dead-letter queue escalation', passed: true });
  } catch (err: any) {
    results.push({ name: 'Queue Processing: Exponential backoff & dead-letter queue escalation', passed: false, error: err.message });
  }

  // Test 4: Safe Job Cancellation
  try {
    const { job } = engine.enqueue('REPO_IMPORT', {}, 5);
    const cancelled = engine.cancel(job.jobId);

    if (!cancelled || job.status !== 'CANCELLED') {
      throw new Error('Safe cancellation failed');
    }

    results.push({ name: 'Queue Processing: Safe cancellation of pending / running tasks', passed: true });
  } catch (err: any) {
    results.push({ name: 'Queue Processing: Safe cancellation of pending / running tasks', passed: false, error: err.message });
  }

  return results;
}
