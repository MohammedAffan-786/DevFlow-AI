import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import { optionalAuthenticate } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/v1/dashboard/stats
router.get('/stats', optionalAuthenticate, async (req: Request, res: Response) => {
  const orgId = req.organizationId || (req.query.organizationId as string);
  const stats = await DashboardService.getStats(orgId);
  res.status(200).json({ success: true, data: stats });
});

export default router;
