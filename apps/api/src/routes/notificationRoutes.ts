import { Router, Request, Response } from 'express';
import { NotificationModel } from '../models/Notification';
import { optionalAuthenticate } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/v1/notifications
router.get('/', optionalAuthenticate, async (_req: Request, res: Response) => {
  const notifications = await NotificationModel.find().sort({ createdAt: -1 }).limit(30);
  const unreadCount = await NotificationModel.countDocuments({ isRead: false });

  res.status(200).json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
  });
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', optionalAuthenticate, async (req: Request, res: Response) => {
  const notification = await NotificationModel.findById(req.params.id);
  if (!notification) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/not-found',
      title: 'Notification Not Found',
      status: 404,
      detail: 'Notification not found.',
    });
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({ success: true, data: notification });
});

// POST /api/v1/notifications/mark-all-read
router.post('/mark-all-read', optionalAuthenticate, async (_req: Request, res: Response) => {
  await NotificationModel.updateMany({ isRead: false }, { $set: { isRead: true } });
  res.status(200).json({ success: true, message: 'All notifications marked as read.' });
});

// POST /api/v1/notifications/test-alert
router.post('/test-alert', optionalAuthenticate, async (req: Request, res: Response) => {
  const { type = 'CRITICAL_SECURITY', title, message } = req.body;
  const notif = await NotificationModel.create({
    userId: (req as any).userId || '65f123456789abcdef012345',
    type,
    title: title || `Security Alert: Vulnerability detected`,
    message: message || `High priority security risk detected by DevFlow AI. Immediate remediation recommended.`,
    severity: type.includes('CRITICAL') ? 'CRITICAL' : 'HIGH',
    isRead: false,
  });
  res.status(201).json({ success: true, data: notif });
});

export default router;
