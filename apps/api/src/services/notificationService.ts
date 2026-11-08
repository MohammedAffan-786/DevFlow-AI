/**
 * notificationService.ts
 * Centralized notification dispatcher for DevFlow AI events:
 *   - Analysis completion
 *   - Critical bug detection
 *   - Critical security findings
 *   - Test execution completion
 *   - Pull-request review completion
 *   - Background job failures
 */

import { NotificationModel, NotificationType } from '../models/Notification';
import { UserModel } from '../models/User';

export interface DispatchNotificationOptions {
  userId?: string;
  organizationId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Dispatch a notification to a specific user or organization members.
   */
  static async dispatch(options: DispatchNotificationOptions): Promise<void> {
    try {
      let targetUserIds: string[] = [];

      if (options.userId) {
        targetUserIds = [options.userId];
      } else {
        // Broadcast to admin/dev users
        const users = await UserModel.find().limit(5).select('_id').lean();
        targetUserIds = users.map((u) => u._id.toString());
      }

      const notifications = targetUserIds.map((uid) => ({
        userId: uid,
        organizationId: options.organizationId || null,
        type: options.type,
        title: options.title,
        message: options.message,
        link: options.link || null,
        severity: options.severity || 'INFO',
        metadata: options.metadata || {},
        isRead: false,
      }));

      await NotificationModel.insertMany(notifications);
      console.log(`[NotificationService] Dispatched ${options.type} to ${targetUserIds.length} user(s).`);
    } catch (err) {
      console.warn('[NotificationService] Failed dispatching notification:', err);
    }
  }

  // 1. Analysis Completion
  static async notifyAnalysisCompleted(
    repoName: string,
    score: number,
    reportId: string,
    userId?: string
  ): Promise<void> {
    await this.dispatch({
      userId,
      type: 'ANALYSIS_COMPLETED',
      title: `Analysis Completed: ${repoName}`,
      message: `Full codebase audit completed with quality score ${score}/100.`,
      link: `/analysis/reports/${reportId}`,
      severity: score < 70 ? 'HIGH' : 'INFO',
      metadata: { repoName, score, reportId },
    });
  }

  // 2. Critical Security Finding
  static async notifyCriticalSecurity(
    repoName: string,
    description: string,
    filePath: string,
    line: number,
    userId?: string
  ): Promise<void> {
    await this.dispatch({
      userId,
      type: 'CRITICAL_SECURITY',
      title: `Critical Security Vulnerability in ${repoName}`,
      message: `${description} identified at ${filePath}:${line}. Immediate remediation required.`,
      link: '/security',
      severity: 'CRITICAL',
      metadata: { repoName, filePath, line },
    });
  }

  // 3. Critical Bug Detection
  static async notifyCriticalBug(
    repoName: string,
    title: string,
    filePath: string,
    userId?: string
  ): Promise<void> {
    await this.dispatch({
      userId,
      type: 'CRITICAL_BUG',
      title: `Critical Defect Detected in ${repoName}`,
      message: `${title} identified at ${filePath}. Potential runtime crash risk.`,
      link: '/bugs',
      severity: 'HIGH',
      metadata: { repoName, filePath },
    });
  }

  // 4. Test Execution Completion
  static async notifyTestCompleted(
    repoName: string,
    total: number,
    passed: number,
    failed: number,
    runId: string,
    userId?: string
  ): Promise<void> {
    await this.dispatch({
      userId,
      type: 'TEST_COMPLETED',
      title: `Test Run Complete: ${repoName}`,
      message: `Executed ${total} tests in isolated sandbox: ${passed} passed, ${failed} failed.`,
      link: `/tests/execution?runId=${runId}`,
      severity: failed > 0 ? 'HIGH' : 'INFO',
      metadata: { repoName, total, passed, failed, runId },
    });
  }

  // 5. Pull-Request Review Completion
  static async notifyPrReviewCompleted(
    repoName: string,
    prNumber: number,
    verdict: string,
    userId?: string
  ): Promise<void> {
    await this.dispatch({
      userId,
      type: 'PR_REVIEW_COMPLETED',
      title: `AI Review Ready: ${repoName} PR #${prNumber}`,
      message: `Automated PR review finished with verdict: ${verdict.replace(/_/g, ' ')}.`,
      link: '/pull-requests',
      severity: verdict === 'NEEDS_SECURITY_TRIAGE' ? 'CRITICAL' : 'INFO',
      metadata: { repoName, prNumber, verdict },
    });
  }

  // 6. Background Job Failure
  static async notifyJobFailed(
    jobName: string,
    errorMsg: string,
    userId?: string
  ): Promise<void> {
    await this.dispatch({
      userId,
      type: 'JOB_FAILED',
      title: `Background Worker Failed: ${jobName}`,
      message: `Job failed during processing: ${errorMsg}. Watchdog alert logged.`,
      link: '/dashboard',
      severity: 'HIGH',
      metadata: { jobName, errorMsg },
    });
  }
}
