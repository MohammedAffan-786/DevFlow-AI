import { QueueService } from '../services/queueService.js';

export class WorkerManager {
  private static isRunning = false;

  public static async startWorkers(): Promise<void> {
    if (this.isRunning) return;
    await QueueService.init();
    this.isRunning = true;
    console.log('[WorkerManager] Queue workers initialized.');
  }

  public static async stopWorkers(): Promise<void> {
    this.isRunning = false;
    console.log('[WorkerManager] Worker manager stopped.');
  }
}
