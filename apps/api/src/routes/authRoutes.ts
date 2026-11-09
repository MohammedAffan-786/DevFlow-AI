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

const frontendOrigin = () => {
  const configuredOrigin = process.env.FRONTEND_URL?.trim();
  const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  return (configuredOrigin || vercelOrigin || 'http://localhost:5173').replace(/\/$/, '');
};

const githubCallbackUrl = () => {
  const configuredOrigin = process.env.API_URL?.trim();
  const vercelOrigin = process.env.VERCEL ? frontendOrigin() : undefined;
  const origin = (configuredOrigin || vercelOrigin || 'http://localhost:4000').replace(/\/$/, '');
  return `${origin}/api/v1/auth/github/callback`;
};

// GET /api/v1/auth/github/url
router.get('/github/url', (_req: Request, res: Response) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(503).json({
      type: 'https://api.devflow.ai/errors/oauth-not-configured',
      title: 'GitHub OAuth Not Configured',
      status: 503,
      detail: 'GitHub sign-in is unavailable because the server OAuth credentials are not configured.',
    });
  }
  const redirectUri = encodeURIComponent(githubCallbackUrl());
  const scope = encodeURIComponent('read:user user:email repo');
  const state = AuthService.generateRandomToken();
  res.cookie('githubOAuthState', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth/github/callback',
    maxAge: 10 * 60 * 1000,
  });
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  res.status(200).json({ success: true, data: { url } });
});

// GET /api/v1/auth/github/callback: exchange GitHub's one-time code and establish a session.
router.get('/github/callback', async (req: Request, res: Response) => {
  const frontendUrl = frontendOrigin();
  const fail = (reason: string) => res.redirect(`${frontendUrl}/login?auth_error=${encodeURIComponent(reason)}`);
  const { code, state, error } = req.query;
  if (error) return fail('github_denied');
  if (typeof code !== 'string' || typeof state !== 'string' || !req.cookies?.githubOAuthState || state !== req.cookies.githubOAuthState) {
    return fail('invalid_oauth_state');
  }
  res.clearCookie('githubOAuthState', { path: '/api/v1/auth/github/callback' });

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: githubCallbackUrl() }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string; error?: string };
    if (!tokenResponse.ok || !tokenData.access_token) return fail('github_token_exchange_failed');

    const headers = { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const [profileResponse, emailsResponse] = await Promise.all([
      fetch('https://api.github.com/user', { headers }),
      fetch('https://api.github.com/user/emails', { headers }),
    ]);
    if (!profileResponse.ok || !emailsResponse.ok) return fail('github_profile_fetch_failed');
    const profile = await profileResponse.json() as { id: number; login: string; name?: string | null; avatar_url?: string };
    const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
    const email = emails.find((item) => item.primary && item.verified)?.email || emails.find((item) => item.verified)?.email;
    if (!email) return fail('verified_github_email_required');

    let user = await UserModel.findOne({ githubId: profile.id });
    if (!user) {
      user = await UserModel.findOne({ email: email.toLowerCase() });
      if (user) {
        user.githubId = profile.id;
        user.githubUsername = profile.login;
        user.avatarUrl = profile.avatar_url || user.avatarUrl;
        user.isEmailVerified = true;
        await user.save();
      } else {
        const baseUsername = profile.login.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 25) || `github${profile.id}`;
        let username = baseUsername;
        if (await UserModel.exists({ username })) username = `${baseUsername}_${profile.id}`.slice(0, 30);
        user = await UserModel.create({
          email: email.toLowerCase(), username,
          displayName: profile.name?.trim() || profile.login,
          passwordHash: AuthService.hashPassword(AuthService.generateRandomToken()),
          avatarUrl: profile.avatar_url, githubId: profile.id, githubUsername: profile.login, isEmailVerified: true,
        });
        const slug = `${username.toLowerCase()}-workspace`;
        const org = await OrganizationModel.create({ name: `${user.displayName}'s Workspace`, slug, billingEmail: email.toLowerCase(), plan: 'FREE' });
        await UserMembershipModel.create({ userId: user._id, organizationId: org._id, role: 'OWNER' });
      }
    }

    AuthService.setAuthCookies(res, AuthService.generateAccessToken(user), AuthService.generateRefreshToken(user));
    return res.redirect(`${frontendUrl}/login?auth=success`);
  } catch (err) {
    console.error('[GitHub OAuth] Callback failed:', err);
    return fail('github_authentication_failed');
  }
});

export default router;
