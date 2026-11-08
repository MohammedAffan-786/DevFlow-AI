import { Router, Request, Response } from 'express';
import { AuditLogModel } from '../models/AuditLog';
import { authenticate, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/v1/audit-logs - Query audit trail
router.get('/', authenticate, requireRole(['OWNER', 'ADMIN', 'DEVELOPER']), async (req: Request, res: Response) => {
  const { category, action, actorEmail, startDate, endDate, limit = 50, page = 1 } = req.query;

  const filter: any = {};
  if (category) filter.category = category;
  if (action) filter.action = action;
  if (actorEmail) filter['actor.email'] = new RegExp(String(actorEmail), 'i');

  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(String(startDate));
    if (endDate) filter.timestamp.$lte = new Date(String(endDate));
  }

  // Developer role can only view their own activity or public actions
  if (req.orgRole === 'DEVELOPER') {
    filter['actor.id'] = req.user?._id.toString();
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    AuditLogModel.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    AuditLogModel.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    },
  });
});

// GET /api/v1/audit-logs/export - Export audit logs as JSON or CSV
router.get('/export', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { format = 'json', category, startDate, endDate } = req.query;

  const filter: any = {};
  if (category) filter.category = category;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(String(startDate));
    if (endDate) filter.timestamp.$lte = new Date(String(endDate));
  }

  const logs = await AuditLogModel.find(filter).sort({ timestamp: -1 }).limit(1000).lean();

  if (format === 'csv') {
    const headers = ['ID', 'Timestamp', 'Category', 'Action', 'ActorEmail', 'ActorRole', 'ResourceType', 'ResourceName', 'Status'];
    const rows = logs.map(l => [
      l._id.toString(),
      l.timestamp.toISOString(),
      l.category,
      l.action,
      l.actor?.email || '',
      l.actor?.role || '',
      l.resource?.type || '',
      `"${(l.resource?.name || '').replace(/"/g, '""')}"`,
      l.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="devflow-audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csvContent);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="devflow-audit-log-${new Date().toISOString().slice(0, 10)}.json"`);
  res.status(200).json({
    exportedAt: new Date().toISOString(),
    total: logs.length,
    logs,
  });
});

export default router;
