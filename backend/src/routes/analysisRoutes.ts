import { Router, Request, Response } from 'express';
import { AnalysisRunModel } from '../models/AnalysisRun';
import { IssueModel } from '../models/Issue';
import { optionalAuthenticate } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/v1/analyses (History)
router.get('/', optionalAuthenticate, async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.repositoryId) {
    filter.repositoryId = req.query.repositoryId;
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const runs = await AnalysisRunModel.find(filter)
    .populate('repositoryId', 'name fullName')
    .populate('pullRequestId', 'prNumber title')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, data: runs });
});

// GET /api/v1/analyses/:id (Detailed Report)
router.get('/:id', optionalAuthenticate, async (req: Request, res: Response) => {
  const run = await AnalysisRunModel.findById(req.params.id)
    .populate('repositoryId')
    .populate('pullRequestId');

  if (!run) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/not-found',
      title: 'Analysis Run Not Found',
      status: 404,
      detail: 'The requested analysis run does not exist.',
    });
  }

  const issues = await IssueModel.find({ analysisRunId: run._id });

  res.status(200).json({
    success: true,
    data: {
      analysisRun: run,
      issues,
      summary: {
        qualityScore: run.metrics.qualityScore,
        totalFindings: issues.length,
        securityRating: run.metrics.securityCriticalCount > 0 ? 'F' : 'A',
        estimatedDebtMinutes: issues.length * 45,
      },
    },
  });
});

export default router;
