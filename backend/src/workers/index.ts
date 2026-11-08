import { QueueService } from '../services/queueService.js';
import { AnalysisEngine } from '../services/analysisEngine.js';
import { TestExecutionService } from '../services/testExecutionService.js';
import { PullRequestReviewService } from '../services/pullRequestReviewService.js';

export class WorkerManager {
  private static isRunning = false;

  public static async startWorkers(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[WorkerManager] Initializing background task workers for Analysis, Tests, and PR Reviews...');
    
    // Register worker handlers for background queues
    QueueService.registerWorker('REPO_ANALYSIS', async (job) => {
      console.log(`[Worker] Executing REPO_ANALYSIS for repo: ${job.data?.repoId}`);
      return AnalysisEngine.runFullAnalysis(job.data?.repoPath, { repoId: job.data?.repoId });
    });

    QueueService.registerWorker('TEST_EXECUTION', async (job) => {
      console.log(`[Worker] Executing TEST_EXECUTION for suite: ${job.data?.suiteId}`);
      return TestExecutionService.executeSuite(job.data?.suiteId, job.data?.command);
    });

    QueueService.registerWorker('PR_REVIEW', async (job) => {
      console.log(`[Worker] Executing PR_REVIEW for PR #${job.data?.prNumber}`);
      return PullRequestReviewService.processPullRequest(job.data);
    });
  }

  public static async stopWorkers(): Promise<void> {
    this.isRunning = false;
    console.log('[WorkerManager] Workers gracefully stopped.');
  }
}
