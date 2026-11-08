import type { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService.js';

export async function getDashboardOverview(req: Request, res: Response) {
  try {
    const orgId = (req as any).user?.organizationId || req.query.orgId;
    const metrics = await DashboardService.getOverviewMetrics(orgId as string);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
