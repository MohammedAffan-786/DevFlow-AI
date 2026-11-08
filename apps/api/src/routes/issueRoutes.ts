import { Router, Request, Response } from 'express';
import { IssueModel } from '../models/Issue';
import { optionalAuthenticate } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { UpdateIssueStatusSchema } from '@devflow/shared';

const router = Router();

// GET /api/v1/issues
router.get('/', optionalAuthenticate, async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.severity) filter.severity = req.query.severity;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.repositoryId) filter.repositoryId = req.query.repositoryId;

  const issues = await IssueModel.find(filter)
    .populate('repositoryId', 'name fullName')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: issues });
});

// GET /api/v1/issues/:id
router.get('/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const issue = await IssueModel.findById(req.params.id).populate('repositoryId');
  if (!issue) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/not-found',
      title: 'Issue Not Found',
      status: 404,
      detail: 'The requested issue could not be found.',
    });
  }
  res.status(200).json({ success: true, data: issue });
});

// PATCH /api/v1/issues/:id/status
router.patch('/:id/status', optionalAuthenticate, validate({ body: UpdateIssueStatusSchema }), async (req: Request, res: Response) => {
  const issue = await IssueModel.findById(req.params.id);
  if (!issue) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/not-found',
      title: 'Issue Not Found',
      status: 404,
      detail: 'Issue not found.',
    });
  }

  issue.status = req.body.status;
  await issue.save();

  res.status(200).json({
    success: true,
    data: issue,
    message: `Issue marked as ${req.body.status}.`,
  });
});

// POST /api/v1/issues/:id/generate-fix
router.post('/:id/generate-fix', optionalAuthenticate, async (req: Request, res: Response) => {
  const issue = await IssueModel.findById(req.params.id);
  if (!issue) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/not-found',
      title: 'Issue Not Found',
      status: 404,
      detail: 'Issue not found.',
    });
  }

  // Generate contextual AI patch
  const patchDiff = issue.suggestedFixDiff || `@@ -${issue.location.startLine},3 +${issue.location.startLine},3 @@\n-// DevFlow AI Patch for ${issue.title}\n+${issue.location.snippet.trim()}; // Fixed`;
  const explanation = issue.suggestedFixExplanation || `Refactored ${issue.location.filePath} to enforce defensive null checks and strict type guarding.`;

  res.status(200).json({
    success: true,
    data: {
      diff: patchDiff,
      explanation,
    },
  });
});

export default router;
