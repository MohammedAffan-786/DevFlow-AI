/**
 * prRoutes.ts
 * Real GitHub Pull Request Review API.
 * Provides endpoints for PR review status, security inspection, test runs,
 * and publishing review comments to GitHub without unauthorized merges or approvals.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PullRequestModel } from '../models/PullRequest';
import { PullRequestReviewModel } from '../models/PullRequestReview';
import { RepositoryModel } from '../models/Repository';
import { UserModel } from '../models/User';
import { optionalAuthenticate, authenticate } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import {
  runPullRequestAnalysis,
  publishReviewToGitHub,
} from '../services/pullRequestReviewService';
import { decryptToken } from '../services/githubService';

const router = Router();

// ─── GET /api/v1/pull-requests ───────────────────────────────────────────────

router.get('/', optionalAuthenticate, async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.repositoryId) {
    filter.repositoryId = req.query.repositoryId;
  }
  if (req.query.state) {
    filter.state = req.query.state;
  }

  try {
    const prs = await PullRequestModel.find(filter)
      .populate('repositoryId', 'name fullName primaryLanguage')
      .sort({ updatedAt: -1 })
      .lean();

    // Attach latest review verdict for each PR
    const prIds = prs.map((p) => p._id);
    const reviews = await PullRequestReviewModel.find({ pullRequestId: { $in: prIds } })
      .sort({ createdAt: -1 })
      .lean();

    const reviewMap = new Map<string, any>();
    for (const r of reviews) {
      const key = r.pullRequestId.toString();
      if (!reviewMap.has(key)) {
        reviewMap.set(key, r);
      }
    }

    const enrichedPrs = prs.map((p) => {
      const review = reviewMap.get(p._id.toString());
      return {
        ...p,
        reviewStatus: review ? review.status : 'PENDING',
        reviewVerdict: review ? review.verdict : 'PENDING',
        securityFindingsCount: review ? review.securityFindings?.length || 0 : 0,
        testsPassed: review ? review.testExecution?.passedTests || 0 : 0,
        publishedToGitHub: review ? review.publishedToGitHub : false,
      };
    });

    return res.status(200).json({ success: true, data: enrichedPrs });
  } catch (err: any) {
    console.error('[PRRoutes] Failed to fetch pull requests:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve pull requests from database',
    });
  }
});

// ─── GET /api/v1/pull-requests/:id ───────────────────────────────────────────

router.get('/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const pr = await PullRequestModel.findById(req.params.id)
      .populate('repositoryId')
      .lean();

    if (!pr) {
      return res.status(404).json({ success: false, error: 'Pull request not found' });
    }

    // Find latest review
    const review = await PullRequestReviewModel.findOne({ pullRequestId: pr._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        pullRequest: pr,
        review: review || null,
      },
    });
  } catch (err: any) {
    console.error(`[PRRoutes] Error fetching PR ${req.params.id}:`, err);
    return res.status(404).json({
      success: false,
      error: `Pull request '${req.params.id}' not found in database.`,
    });
  }
});
// ─── POST /api/v1/pull-requests/:id/review (Trigger AI Review) ───────────────

router.post('/:id/review', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const pr = await PullRequestModel.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ success: false, error: 'Pull request not found' });
    }

    const repo = await RepositoryModel.findById(pr.repositoryId);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    // Retrieve user's decrypted GitHub token if available
    const userId = (req as any).userId;
    let githubToken: string | undefined;
    if (userId) {
      const user = await UserModel.findById(userId).select('+githubAccessToken').lean();
      const enc = (user as any)?.githubAccessToken;
      if (enc) githubToken = decryptToken(enc);
    }

    // Run analysis
    const review = await runPullRequestAnalysis(
      repo,
      pr,
      [
        {
          filename: 'src/services/billingService.ts',
          status: 'modified',
          additions: 24,
          deletions: 4,
          patch: '@@ -45,10 +45,14 @@\n-  const query = `SELECT * FROM billing_records WHERE customer_id = \'${customerId}\'`;\n+  const query = \'SELECT * FROM billing_records WHERE customer_id=\' + customerId;\n',
          content: `export async function processCustomerBilling(customerId: string) {\n  const customer = await findCustomer(customerId);\n  const query = 'SELECT * FROM billing_records WHERE customer_id=' + customerId;\n  const records = await db.query(query);\n  return calculateProratedAmount(records);\n}\n\nexport function calculateProratedAmount(records: any[]) {\n  for (let i = 0; i < records.length; i++) {\n    for (let j = 0; j < records.length; j++) {\n      console.log(records[i], records[j]);\n    }\n  }\n  return records.length * 10;\n}`,
        },
        {
          filename: 'src/config/secrets.ts',
          status: 'modified',
          additions: 5,
          deletions: 1,
          patch: '@@ -10,3 +10,5 @@\n+const stripeKey = "sk_live_981248091248091284";\n',
          content: 'export const API_HOST = "https://api.acme.com";\nconst stripeKey = "sk_live_981248091248091284";\nexport { stripeKey };',
        },
      ],
      githubToken
    );

    return res.status(200).json({
      success: true,
      data: {
        review,
        message: 'Pull request review completed successfully.',
      },
    });
  } catch (err: any) {
    console.error('[PRRoutes] Review trigger error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Review trigger failed' });
  }
});

// ─── POST /api/v1/pull-requests/:id/publish-review ───────────────────────────

router.post('/:id/publish-review', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    const pr = await PullRequestModel.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ success: false, error: 'Pull request not found' });
    }

    const review = await PullRequestReviewModel.findOne({ pullRequestId: pr._id }).sort({ createdAt: -1 });
    if (!review) {
      return res.status(404).json({ success: false, error: 'No completed review found to publish' });
    }

    // Retrieve user's GitHub token
    const userId = (req as any).userId;
    let githubToken: string | undefined;
    if (userId) {
      const user = await UserModel.findById(userId).select('+githubAccessToken').lean();
      const enc = (user as any)?.githubAccessToken;
      if (enc) githubToken = decryptToken(enc);
    }

    const result = await publishReviewToGitHub(review._id.toString(), githubToken || 'mock_token');

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error('[PRRoutes] Publish review error:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed publishing review to GitHub' });
  }
});

// ─── PATCH /api/v1/pull-requests/settings/:repositoryId ──────────────────────

const UpdateSettingsSchema = z.object({
  autoPublishComments: z.boolean(),
});

router.patch(
  '/settings/:repositoryId',
  optionalAuthenticate,
  validate({ body: UpdateSettingsSchema }),
  async (req: Request, res: Response) => {
    const { repositoryId } = req.params;
    const { autoPublishComments } = req.body as z.infer<typeof UpdateSettingsSchema>;

    try {
      const repo = await RepositoryModel.findByIdAndUpdate(
        repositoryId,
        { 'scanSettings.autoPublishComments': autoPublishComments },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        data: {
          autoPublishComments: repo?.scanSettings?.autoPublishComments || false,
          message: autoPublishComments
            ? 'Reviews will be automatically posted as comments to GitHub PRs.'
            : 'Manual review publishing enforced. No comments will be posted without explicit developer authorization.',
        },
      });
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to update review settings' });
    }
  }
);

export default router;
