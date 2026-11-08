import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { AuthService } from '../services/authService';

const router = Router();

// GET /api/v1/user/profile
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  const userDTO = await AuthService.formatUserDTO(req.user!);
  res.status(200).json({ success: true, data: userDTO });
});

// PATCH /api/v1/user/profile
router.patch('/profile', authenticate, async (req: Request, res: Response) => {
  const { displayName, avatarUrl } = req.body;
  const user = req.user!;

  if (displayName) user.displayName = displayName;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  await user.save();

  const userDTO = await AuthService.formatUserDTO(user);
  res.status(200).json({ success: true, data: userDTO, message: 'Profile updated successfully.' });
});

// PATCH /api/v1/user/change-password
router.patch('/change-password', authenticate, async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.user!;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/bad-request',
      title: 'Missing Fields',
      status: 400,
      detail: 'Current password and new password are required.',
    });
  }

  if (!AuthService.verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({
      type: 'https://api.devflow.ai/errors/invalid-credentials',
      title: 'Current Password Incorrect',
      status: 401,
      detail: 'The current password you provided is incorrect.',
    });
  }

  user.passwordHash = AuthService.hashPassword(newPassword);
  await user.save();

  res.status(200).json({ success: true, message: 'Password changed successfully.' });
});

export default router;
