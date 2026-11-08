/**
 * developerIntelligenceRoutes.ts
 * Endpoints for:
 *   - False-positive & finding triage reporting (preserves original finding!)
 *   - Feedback audit log
 *   - Developer analytics dashboard
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FindingFeedbackModel } from '../models/FindingFeedback';
import { IssueModel } from '../models/Issue';
import { optionalAuthenticate } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { DeveloperAnalyticsService } from '../services/developerAnalyticsService';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const FeedbackSchema = z.object({
  findingId: z.string().min(1),
  repositoryId: z.string().min(1),
  classification: z.enum([
    'FALSE_POSITIVE',
    'ACCEPTED_RISK',
    'NOT_APPLICABLE',
    'ALREADY_FIXED',
    'NEEDS_INVESTIGATION',
  ]),
  explanation: z.string().optional(),
  originalFinding: z.record(z.any()),
});

// ─── POST /api/v1/findings/feedback ──────────────────────────────────────────

/**
 * Report a false positive or triage finding.
 * Preserves the original finding in the audit trail without silently deleting it.
 */
router.post(
  '/feedback',
  optionalAuthenticate,
  validate({ body: FeedbackSchema }),
  async (req: Request, res: Response) => {
    const { findingId, repositoryId, classification, explanation, originalFinding } = req.body as z.infer<typeof FeedbackSchema>;
    const userId = (req as any).userId;
    const userEmail = (req as any).user?.email || 'developer@acme.com';

    try {
      // 1. Record feedback in audit trail — preserving original finding
      const feedback = await FindingFeedbackModel.create({
        findingId,
        repositoryId,
        userId,
        userEmail,
        classification,
        explanation: explanation || '',
        originalFinding,
      });

      // 2. Update issue status in IssueModel if matching issue exists
      try {
        const issueStatusMap: Record<string, string> = {
          FALSE_POSITIVE: 'FALSE_POSITIVE',
          ACCEPTED_RISK: 'IGNORED',
          NOT_APPLICABLE: 'IGNORED',
          ALREADY_FIXED: 'RESOLVED',
          NEEDS_INVESTIGATION: 'OPEN',
        };

        await IssueModel.findOneAndUpdate(
          {
            $or: [
              { fingerprint: findingId },
              { 'location.filePath': originalFinding.filePath, 'location.startLine': originalFinding.startLine },
            ],
          },
          { status: issueStatusMap[classification] || 'OPEN' }
        );
      } catch {}

      return res.status(201).json({
        success: true,
        data: {
          feedback,
          message: `Finding marked as ${classification.replace(/_/g, ' ')}. Original finding preserved in audit history.`,
        },
      });
    } catch (err: any) {
      console.error('[FeedbackRoutes] Failed recording feedback:', err);
      return res.status(500).json({ success: false, error: 'Failed to record triage feedback' });
    }
  }
);

// ─── GET /api/v1/findings/feedback ───────────────────────────────────────────

router.get('/feedback', optionalAuthenticate, async (req: Request, res: Response) => {
  const { repositoryId, limit = '50' } = req.query;
  const filter: any = {};
  if (repositoryId) filter.repositoryId = repositoryId;

  try {
    const list = await FindingFeedbackModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string, 10))
      .lean();

    return res.status(200).json({ success: true, data: { feedback: list, total: list.length } });
  } catch (err: any) {
    console.error('[FeedbackRoutes] Failed to query feedback audit trail:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve feedback records from database',
    });
  }
});

// ─── GET /api/v1/analytics/developer ─────────────────────────────────────────

router.get('/analytics/developer', optionalAuthenticate, async (req: Request, res: Response) => {
  const { repositoryId } = req.query as { repositoryId?: string };

  try {
    const analytics = await DeveloperAnalyticsService.getAnalytics(repositoryId);
    return res.status(200).json({ success: true, data: analytics });
  } catch (err: any) {
    console.error('[AnalyticsRoutes] Error fetching analytics:', err);
    return res.status(500).json({ success: false, error: 'Failed to compute developer analytics' });
  }
});

export default router;
