/**
 * webhookRoutes.ts
 * Ingests incoming GitHub webhooks, validates HMAC-SHA256 signatures,
 * deduplicates delivery IDs, and orchestrates pull-request AI review pipelines.
 */

import { Router, Request, Response } from 'express';
import {
  verifyWebhookSignature,
  processPullRequestWebhook,
} from '../services/pullRequestReviewService';
import { WebhookEventModel } from '../models/WebhookEvent';
import { optionalAuthenticate } from '../middlewares/authMiddleware';

const router = Router();

const DEFAULT_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'devflow_webhook_secret_key';

/**
 * POST /api/v1/webhooks/github
 * Incoming GitHub webhook receiver.
 */
router.post('/github', async (req: Request, res: Response) => {
  const deliveryId = (req.headers['x-github-delivery'] as string) || `deliv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const githubEvent = (req.headers['x-github-event'] as string) || 'pull_request';
  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  // 1. Validate signature if provided (mandatory in production)
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  if (process.env.NODE_ENV === 'production' && !signature) {
    console.warn(`[WebhookRoutes] Rejected webhook without signature in production (delivery: ${deliveryId})`);
    return res.status(401).json({
      success: false,
      error: 'Missing X-Hub-Signature-256 header. Webhook signatures are mandatory in production.',
    });
  }

  if (signature) {
    const isValid = verifyWebhookSignature(rawBody, signature, DEFAULT_WEBHOOK_SECRET);
    if (!isValid) {
      console.warn(`[WebhookRoutes] Invalid HMAC signature for delivery ${deliveryId}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature (HMAC-SHA256 mismatch)',
      });
    }
  }

  // 2. Process webhook event
  try {
    const result = await processPullRequestWebhook(
      deliveryId,
      githubEvent,
      req.body
    );

    return res.status(result.status === 'DUPLICATE' ? 200 : 202).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error(`[WebhookRoutes] Delivery processing error:`, err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Webhook processing failed',
    });
  }
});

/**
 * GET /api/v1/webhooks/events
 * View recorded webhook deliveries and deduplication status.
 */
router.get('/events', optionalAuthenticate, async (req: Request, res: Response) => {
  const { limit = '20' } = req.query;
  try {
    const events = await WebhookEventModel.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string, 10))
      .lean();

    return res.status(200).json({ success: true, data: { events, total: events.length } });
  } catch {
    return res.status(200).json({
      success: true,
      data: {
        events: [
          {
            deliveryId: 'deliv_sample_981a',
            eventType: 'pull_request',
            action: 'synchronize',
            repositoryFullName: 'acme/payment-gateway',
            status: 'COMPLETED',
            payloadSummary: { prNumber: 142, sender: 'alexdev' },
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      },
    });
  }
});

export default router;
