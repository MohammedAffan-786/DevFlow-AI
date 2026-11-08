/**
 * githubRoutes.ts
 * All GitHub OAuth and repository API endpoints.
 * GitHub access tokens are NEVER sent to the browser.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { UserModel } from '../models/User';
import { RepositoryModel } from '../models/Repository';
import {
  getOAuthUrl,
  exchangeCodeForToken,
  listUserRepositories,
  listBranches,
  getCommitHistory,
  getRepositoryTree,
  encryptToken,
  decryptToken,
} from '../services/githubService';

const router = Router();

// All GitHub routes require authentication
router.use(authMiddleware);

// ─── OAuth ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/github/oauth/url
 * Returns the GitHub OAuth authorization URL.
 * The state token is stored server-side for CSRF verification.
 */
router.get('/oauth/url', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId?: string }).userId!;
    const { url, state } = getOAuthUrl(userId);

    // Store state in session/DB for verification on callback
    await UserModel.findByIdAndUpdate(userId, { githubOAuthState: state });

    res.status(200).json({
      success: true,
      data: { authorizationUrl: url },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate OAuth URL' });
  }
});

/**
 * POST /api/v1/github/oauth/callback
 * Body: { code, state }
 * Exchanges the OAuth code for an access token, encrypts and persists it.
 * Returns user DTO — NEVER the token.
 */
const CallbackSchema = z.object({
  code: z.string().min(1, 'OAuth code is required'),
  state: z.string().min(1, 'State is required'),
});

router.post(
  '/oauth/callback',
  validate({ body: CallbackSchema }),
  async (req: Request, res: Response) => {
    const userId = (req as Request & { userId?: string }).userId!;
    const { code, state } = req.body as z.infer<typeof CallbackSchema>;

    try {
      // Verify CSRF state
      const user = await UserModel.findById(userId).select('+githubOAuthState').lean();
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      const storedState = (user as Record<string, unknown>).githubOAuthState as string | undefined;
      if (storedState && storedState !== state) {
        return res.status(400).json({ success: false, error: 'Invalid OAuth state — possible CSRF' });
      }

      // Exchange code for access token
      const tokenResult = await exchangeCodeForToken(code);
      if (!tokenResult.success) {
        return res.status(400).json({ success: false, error: tokenResult.error ?? 'Token exchange failed' });
      }

      // Encrypt and store — never plain text
      const encryptedToken = encryptToken(tokenResult.accessToken!);

      await UserModel.findByIdAndUpdate(userId, {
        githubAccessToken: encryptedToken,
        githubConnected: true,
        githubLogin: tokenResult.login ?? null,
        githubOAuthState: null, // Clear state after use
      });

      return res.status(200).json({
        success: true,
        data: {
          connected: true,
          login: tokenResult.login ?? null,
          message: 'GitHub account connected successfully',
        },
      });
    } catch (err) {
      console.error('[GitHubRoutes] OAuth callback error:', err);
      return res.status(500).json({ success: false, error: 'GitHub authentication failed' });
    }
  }
);

/**
 * DELETE /api/v1/github/oauth/disconnect
 * Revokes GitHub connection for the authenticated user.
 */
router.delete('/oauth/disconnect', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId!;
  try {
    await UserModel.findByIdAndUpdate(userId, {
      githubAccessToken: null,
      githubConnected: false,
      githubLogin: null,
    });
    res.status(200).json({ success: true, data: { message: 'GitHub account disconnected' } });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to disconnect GitHub account' });
  }
});

/**
 * GET /api/v1/github/status
 * Returns whether the user has a connected GitHub account (no token exposed).
 */
router.get('/status', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId!;
  try {
    const user = await UserModel.findById(userId)
      .select('githubConnected githubLogin')
      .lean();
    res.status(200).json({
      success: true,
      data: {
        connected: (user as Record<string, unknown>)?.githubConnected ?? false,
        login: (user as Record<string, unknown>)?.githubLogin ?? null,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to retrieve GitHub status' });
  }
});

// ─── Repository helpers ───────────────────────────────────────────────────────

/** Retrieve and decrypt the user's GitHub token from DB. */
async function getUserGitHubToken(userId: string): Promise<string | null> {
  const user = await UserModel.findById(userId)
    .select('+githubAccessToken')
    .lean()
    .catch(() => null);
  if (!user) return null;

  const encryptedToken = (user as Record<string, unknown>).githubAccessToken as string | undefined;
  if (!encryptedToken) return null;

  return decryptToken(encryptedToken);
}

/**
 * GET /api/v1/github/repositories
 * Lists repositories accessible to the authenticated GitHub user.
 */
router.get('/repositories', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId!;
  try {
    const token = await getUserGitHubToken(userId);
    const repos = await listUserRepositories(token ?? undefined);
    res.status(200).json({ success: true, data: { repositories: repos, total: repos.length } });
  } catch (err) {
    console.error('[GitHubRoutes] listRepositories error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch repositories' });
  }
});

/**
 * GET /api/v1/github/repositories/:owner/:repo/branches
 */
router.get('/repositories/:owner/:repo/branches', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId!;
  const { owner, repo } = req.params;
  try {
    const token = await getUserGitHubToken(userId);
    const branches = await listBranches(owner, repo, token ?? undefined);
    res.status(200).json({ success: true, data: { branches } });
  } catch (err) {
    console.error('[GitHubRoutes] listBranches error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
});

/**
 * GET /api/v1/github/repositories/:owner/:repo/commits?branch=main&page=1
 */
router.get('/repositories/:owner/:repo/commits', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId!;
  const { owner, repo } = req.params;
  const branch = (req.query.branch as string) || 'main';
  const page = parseInt(req.query.page as string, 10) || 1;
  try {
    const token = await getUserGitHubToken(userId);
    const commits = await getCommitHistory(owner, repo, branch, page, token ?? undefined);
    res.status(200).json({ success: true, data: { commits } });
  } catch (err) {
    console.error('[GitHubRoutes] getCommitHistory error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch commits' });
  }
});

/**
 * GET /api/v1/github/repositories/:owner/:repo/tree?branch=main
 */
router.get('/repositories/:owner/:repo/tree', async (req: Request, res: Response) => {
  const userId = (req as Request & { userId?: string }).userId!;
  const { owner, repo } = req.params;
  const branch = (req.query.branch as string) || 'main';
  try {
    const token = await getUserGitHubToken(userId);
    const tree = await getRepositoryTree(owner, repo, branch, token ?? undefined);
    res.status(200).json({ success: true, data: { tree } });
  } catch (err) {
    console.error('[GitHubRoutes] getRepositoryTree error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch repository tree' });
  }
});

// ─── Repository import ────────────────────────────────────────────────────────

const ImportRepoSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  description: z.string().optional(),
  isPrivate: z.boolean().optional().default(false),
  defaultBranch: z.string().optional().default('main'),
  language: z.string().optional(),
  url: z.string().url().optional(),
  cloneUrl: z.string().optional(),
  githubId: z.number().optional(),
  stars: z.number().optional().default(0),
  forks: z.number().optional().default(0),
});

/**
 * POST /api/v1/github/repositories/import
 * Imports selected GitHub repository metadata into DevFlow DB.
 */
router.post(
  '/repositories/import',
  validate({ body: ImportRepoSchema }),
  async (req: Request, res: Response) => {
    const userId = (req as Request & { userId?: string }).userId!;
    const data = req.body as z.infer<typeof ImportRepoSchema>;

    try {
      // Check if already imported
      const existing = await RepositoryModel.findOne({
        'githubMeta.fullName': data.fullName,
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: { repository: existing, alreadyImported: true },
        });
      }

      const repo = await RepositoryModel.create({
        name: data.name,
        owner: data.owner,
        fullName: data.fullName,
        description: data.description ?? '',
        isPrivate: data.isPrivate,
        defaultBranch: data.defaultBranch,
        language: data.language ?? 'Unknown',
        url: data.url ?? `https://github.com/${data.fullName}`,
        cloneUrl: data.cloneUrl ?? `https://github.com/${data.fullName}.git`,
        status: 'active',
        userId,
        githubMeta: {
          githubId: data.githubId,
          fullName: data.fullName,
          stars: data.stars,
          forks: data.forks,
        },
        analysis: {
          lastAnalyzedAt: null,
          qualityScore: 0,
          issuesCount: 0,
          vulnerabilitiesCount: 0,
        },
      });

      return res.status(201).json({
        success: true,
        data: { repository: repo, alreadyImported: false },
      });
    } catch (err) {
      console.error('[GitHubRoutes] importRepository error:', err);
      return res.status(500).json({ success: false, error: 'Failed to import repository' });
    }
  }
);

export default router;
