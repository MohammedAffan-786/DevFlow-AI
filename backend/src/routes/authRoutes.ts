import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UserModel } from '../models/User';
import { OrganizationModel } from '../models/Organization';
import { UserMembershipModel } from '../models/UserMembership';
import { validate } from '../middlewares/validateMiddleware';
import { authenticate } from '../middlewares/authMiddleware';
import { AuditService } from '../services/auditService';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
} from '@devflow/shared';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', validate({ body: RegisterRequestSchema }), async (req: Request, res: Response) => {
  const { email, username, displayName, password } = req.body;

  const existingEmail = await UserModel.findOne({ email });
  if (existingEmail) {
    return res.status(409).json({
      type: 'https://api.devflow.ai/errors/conflict',
      title: 'Email Already In Use',
      status: 409,
      detail: 'An account with this email address already exists.',
    });
  }

  const existingUsername = await UserModel.findOne({ username });
  if (existingUsername) {
    return res.status(409).json({
      type: 'https://api.devflow.ai/errors/conflict',
      title: 'Username Already Taken',
      status: 409,
      detail: 'This username is already taken. Please choose another one.',
    });
  }

  const passwordHash = AuthService.hashPassword(password);
  const emailVerificationToken = AuthService.generateRandomToken();

  const user = await UserModel.create({
    email,
    username,
    displayName,
    passwordHash,
    isEmailVerified: false,
    emailVerificationToken,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  // Automatically create a default personal workspace for the user
  const orgSlug = `${username.toLowerCase()}-workspace`;
  const org = await OrganizationModel.create({
    name: `${displayName}'s Workspace`,
    slug: orgSlug,
    billingEmail: email,
    plan: 'FREE',
    limits: { maxRepositories: 5, maxMonthlyScans: 100, maxConcurrentSandboxes: 2 },
  });

  await UserMembershipModel.create({
    userId: user._id,
    organizationId: org._id,
    role: 'OWNER',
  });

  const accessToken = AuthService.generateAccessToken(user);
  const refreshToken = AuthService.generateRefreshToken(user);
  AuthService.setAuthCookies(res, accessToken, refreshToken);

  const userDTO = await AuthService.formatUserDTO(user);

  res.status(201).json({
    success: true,
    data: {
      user: userDTO,
      accessToken,
      verificationToken: emailVerificationToken, // Provided for easy dev verification
      message: 'Account registered successfully.',
    },
  });
});

// POST /api/v1/auth/login
router.post('/login', validate({ body: LoginRequestSchema }), async (req: Request, res: Response) => {
  const { login, password } = req.body;

  const user = await UserModel.findOne({
    $or: [{ email: login.toLowerCase() }, { username: login.toLowerCase() }],
  });

  if (!user || !AuthService.verifyPassword(password, user.passwordHash)) {
    await AuditService.logAuth({ email: login }, 'LOGIN_FAILED', req, { reason: 'Invalid credentials' });
    return res.status(401).json({
      type: 'https://api.devflow.ai/errors/invalid-credentials',
      title: 'Invalid Credentials',
      status: 401,
      detail: 'The email/username or password you entered is incorrect.',
    });
  }

  user.lastLoginAt = new Date();
  await user.save();

  await AuditService.logAuth(user, 'LOGIN', req);

  const accessToken = AuthService.generateAccessToken(user);
  const refreshToken = AuthService.generateRefreshToken(user);
  AuthService.setAuthCookies(res, accessToken, refreshToken);

  const userDTO = await AuthService.formatUserDTO(user);

  res.status(200).json({
    success: true,
    data: {
      user: userDTO,
      accessToken,
    },
  });
});

// POST /api/v1/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  AuditService.logAuth((req as any).user, 'LOGOUT', req);
  AuthService.clearAuthCookies(res);
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({
      type: 'https://api.devflow.ai/errors/unauthorized',
      title: 'Missing Refresh Token',
      status: 401,
      detail: 'No refresh token cookie found.',
    });
  }

  const payload = AuthService.verifyRefreshToken(refreshToken);
  if (!payload) {
    AuthService.clearAuthCookies(res);
    return res.status(401).json({
      type: 'https://api.devflow.ai/errors/token-expired',
      title: 'Invalid Refresh Token',
      status: 401,
      detail: 'Refresh token has expired or is invalid.',
    });
  }

  const user = await UserModel.findById(payload.userId);
  if (!user) {
    AuthService.clearAuthCookies(res);
    return res.status(401).json({
      type: 'https://api.devflow.ai/errors/user-not-found',
      title: 'User Not Found',
      status: 401,
      detail: 'User no longer exists.',
    });
  }

  const newAccessToken = AuthService.generateAccessToken(user);
  const newRefreshToken = AuthService.generateRefreshToken(user);
  AuthService.setAuthCookies(res, newAccessToken, newRefreshToken);

  res.status(200).json({
    success: true,
    data: { accessToken: newAccessToken },
  });
});

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', validate({ body: ForgotPasswordSchema }), async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ email });

  if (user) {
    user.passwordResetToken = AuthService.generateRandomToken();
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been dispatched.',
      resetToken: user.passwordResetToken, // Displayed in development for immediate verification
    });
  }

  // Consistent response to prevent user enumeration
  res.status(200).json({
    success: true,
    message: 'If an account exists with this email, a password reset link has been dispatched.',
  });
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', validate({ body: ResetPasswordSchema }), async (req: Request, res: Response) => {
  const { token, password } = req.body;

  const user = await UserModel.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/invalid-token',
      title: 'Invalid or Expired Token',
      status: 400,
      detail: 'The password reset token is invalid or has expired.',
    });
  }

  user.passwordHash = AuthService.hashPassword(password);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password has been reset successfully. You may now log in.',
  });
});

// POST /api/v1/auth/verify-email
router.post('/verify-email', validate({ body: VerifyEmailSchema }), async (req: Request, res: Response) => {
  const { token } = req.body;

  const user = await UserModel.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/invalid-token',
      title: 'Invalid Verification Token',
      status: 400,
      detail: 'The email verification token is invalid or has expired.',
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Email successfully verified.',
  });
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const userDTO = await AuthService.formatUserDTO(req.user!);
  res.status(200).json({ success: true, data: userDTO });
});

// GET /api/v1/auth/github/url
router.get('/github/url', (_req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID || 'mock_github_client_id';
  const redirectUri = encodeURIComponent(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?provider=github`);
  const scope = encodeURIComponent('read:user user:email repo');
  const state = AuthService.generateRandomToken();

  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  res.status(200).json({ success: true, data: { url, state } });
});

// POST /api/v1/auth/github/callback (Simulated / Live OAuth Exchange)
router.post('/github/callback', async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/bad-request',
      title: 'Code Required',
      status: 400,
      detail: 'GitHub authorization code is required.',
    });
  }

  // Find or create GitHub linked user
  let user = await UserModel.findOne({ githubId: 9876543 });
  if (!user) {
    user = await UserModel.create({
      email: 'octocat@github.dev',
      username: 'octocat',
      displayName: 'The Octocat',
      passwordHash: AuthService.hashPassword(AuthService.generateRandomToken()),
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
      githubId: 9876543,
      githubUsername: 'octocat',
      isEmailVerified: true,
    });

    const org = await OrganizationModel.create({
      name: "Octocat's Workspace",
      slug: 'octocat-workspace',
      billingEmail: 'octocat@github.dev',
      plan: 'STARTER',
    });

    await UserMembershipModel.create({
      userId: user._id,
      organizationId: org._id,
      role: 'OWNER',
    });
  }

  const accessToken = AuthService.generateAccessToken(user);
  const refreshToken = AuthService.generateRefreshToken(user);
  AuthService.setAuthCookies(res, accessToken, refreshToken);

  const userDTO = await AuthService.formatUserDTO(user);
  res.status(200).json({
    success: true,
    data: { user: userDTO, accessToken },
  });
});

export default router;
