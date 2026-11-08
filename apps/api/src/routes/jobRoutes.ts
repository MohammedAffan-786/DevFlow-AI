import { Router, Request, Response } from 'express';
import { QueueService } from '../services/queueService';
import { JobRecordModel, JobType } from '../models/JobRecord';
import { authenticate, requireRole, requirePermission } from '../middlewares/authMiddleware';
import { AuditService } from '../services/auditService';

const router = Router();

// GET /api/v1/jobs - Query recent background jobs
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { type, status, repositoryId, isDeadLetter, limit = 50, page = 1 } = req.query;

  const filter: any = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (repositoryId) filter.repositoryId = repositoryId;
  if (isDeadLetter === 'true') filter['deadLetter.isDeadLetter'] = true;

  const skip = (Number(page) - 1) * Number(limit);
  const [jobs, total] = await Promise.all([
    JobRecordModel.find(filter)
      .sort({ enqueuedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    JobRecordModel.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      jobs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// GET /api/v1/jobs/stats/summary - Queue overview metrics
router.get('/stats/summary', authenticate, async (_req: Request, res: Response) => {
  const [active, pending, completed, failed, deadLetters] = await Promise.all([
    JobRecordModel.countDocuments({ status: { $in: ['ACTIVE', 'PROGRESS'] } }),
    JobRecordModel.countDocuments({ status: { $in: ['PENDING', 'WAITING'] } }),
    JobRecordModel.countDocuments({ status: 'COMPLETED' }),
    JobRecordModel.countDocuments({ status: 'FAILED' }),
    JobRecordModel.countDocuments({ 'deadLetter.isDeadLetter': true }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      active,
      pending,
      completed,
      failed,
      deadLetters,
      totalProcessed: completed + failed + deadLetters,
      healthy: deadLetters === 0,
    },
  });
});

// GET /api/v1/jobs/:jobId - Poll status and progress
router.get('/:jobId', authenticate, async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = await JobRecordModel.findOne({ jobId });

  if (!job) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/job-not-found',
      title: 'Job Not Found',
      status: 404,
      detail: `Background job with ID '${jobId}' was not found.`,
      instance: req.originalUrl,
    });
  }

  res.status(200).json({
    success: true,
    data: job,
  });
});

// POST /api/v1/jobs/dispatch - Dispatch any of the 8 background jobs asynchronously (Returns 202 Accepted)
router.post('/dispatch', authenticate, requirePermission('RUN_ANALYSIS'), async (req: Request, res: Response) => {
  const { type, payload, priority, repositoryId, dedupKey } = req.body;

  if (!type) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/invalid-request',
      title: 'Missing Job Type',
      status: 400,
      detail: 'The field "type" is required.',
      instance: req.originalUrl,
    });
  }

  const result = await QueueService.enqueue({
    type: type as JobType,
    payload: payload || {},
    priority,
    organizationId: req.organizationId,
    repositoryId: repositoryId || payload?.repositoryId,
    userId: req.user?._id.toString(),
    dedupKey: dedupKey || (repositoryId ? `job_${type}_${repositoryId}_${Date.now()}` : undefined),
  });

  // Track in Audit Log
  await AuditService.log({
    organizationId: req.organizationId,
    userId: req.user?._id,
    actor: {
      id: req.user?._id.toString() || 'user',
      name: req.user?.displayName || 'User',
      email: req.user?.email || 'user@devflow.ai',
      role: req.orgRole || 'DEVELOPER',
    },
    action: `JOB_DISPATCHED_${type}`,
    category: type.includes('TEST') ? 'TESTING' : 'ANALYSIS',
    resource: {
      type: 'JobRecord',
      id: result.jobId,
      name: `${type} Job`,
    },
    details: {
      isDuplicate: result.isDuplicate,
      repositoryId,
    },
  });

  res.status(202).json({
    success: true,
    message: result.isDuplicate ? 'Attaching to already active job' : 'Job accepted and queued for background processing',
    data: {
      jobId: result.jobId,
      status: result.status,
      isDuplicate: result.isDuplicate || false,
      trackingUrl: `/api/v1/jobs/${result.jobId}`,
    },
  });
});

// POST /api/v1/jobs/:jobId/cancel - Safely cancel job
router.post('/:jobId/cancel', authenticate, requireRole(['OWNER', 'ADMIN', 'DEVELOPER']), async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const outcome = await QueueService.cancelJob(jobId, req.user?.displayName);

  if (!outcome.success) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/cancellation-failed',
      title: 'Cancellation Failed',
      status: 400,
      detail: outcome.message,
    });
  }

  await AuditService.log({
    organizationId: req.organizationId,
    userId: req.user?._id,
    actor: {
      id: req.user?._id.toString() || 'user',
      name: req.user?.displayName || 'User',
      email: req.user?.email || 'user@devflow.ai',
      role: req.orgRole || 'DEVELOPER',
    },
    action: 'JOB_CANCELLED',
    category: 'ANALYSIS',
    resource: {
      type: 'JobRecord',
      id: jobId,
    },
  });

  res.status(200).json({
    success: true,
    message: outcome.message,
  });
});

// POST /api/v1/jobs/:jobId/retry - Replay dead-letter or failed job
router.post('/:jobId/retry', authenticate, requireRole(['OWNER', 'ADMIN', 'DEVELOPER']), async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const outcome = await QueueService.replayDeadLetter(jobId);

  if (!outcome.success) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/replay-failed',
      title: 'Replay Failed',
      status: 400,
      detail: outcome.message,
    });
  }

  await AuditService.log({
    organizationId: req.organizationId,
    userId: req.user?._id,
    actor: {
      id: req.user?._id.toString() || 'user',
      name: req.user?.displayName || 'User',
      email: req.user?.email || 'user@devflow.ai',
      role: req.orgRole || 'DEVELOPER',
    },
    action: 'DEAD_LETTER_JOB_REPLAYED',
    category: 'ADMINISTRATION',
    resource: {
      type: 'JobRecord',
      id: jobId,
    },
    details: {
      newJobId: outcome.newJobId,
    },
  });

  res.status(202).json({
    success: true,
    message: outcome.message,
    data: {
      newJobId: outcome.newJobId,
      trackingUrl: `/api/v1/jobs/${outcome.newJobId}`,
    },
  });
});

export default router;
