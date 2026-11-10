import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService.js';
import { UserModel, IUser } from '../models/User.js';
import { UserMembershipModel, IUserMembership, OrganizationRole } from '../models/UserMembership.js';
import { OrganizationModel } from '../models/Organization.js';

export type Permission =
  | 'MANAGE_BILLING'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_TEAM'
  | 'MANAGE_REPOSITORIES'
  | 'CONFIGURE_INTEGRATIONS'
  | 'RUN_ANALYSIS'
  | 'GENERATE_TESTS'
  | 'SUBMIT_FEEDBACK'
  | 'VIEW_REPORTS'
  | 'VIEW_DASHBOARD';

const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  OWNER: [
    'MANAGE_BILLING',
    'MANAGE_SETTINGS',
    'MANAGE_TEAM',
    'MANAGE_REPOSITORIES',
    'CONFIGURE_INTEGRATIONS',
    'RUN_ANALYSIS',
    'GENERATE_TESTS',
    'SUBMIT_FEEDBACK',
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
  ADMIN: [
    'MANAGE_TEAM',
    'MANAGE_REPOSITORIES',
    'CONFIGURE_INTEGRATIONS',
    'RUN_ANALYSIS',
    'GENERATE_TESTS',
    'SUBMIT_FEEDBACK',
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
  DEVELOPER: [
    'RUN_ANALYSIS',
    'GENERATE_TESTS',
    'SUBMIT_FEEDBACK',
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
  MEMBER: [
    'RUN_ANALYSIS',
    'GENERATE_TESTS',
    'SUBMIT_FEEDBACK',
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
  VIEWER: [
    'VIEW_REPORTS',
    'VIEW_DASHBOARD',
  ],
};

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      orgRole?: OrganizationRole;
      organizationId?: string;
      membership?: IUserMembership;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.accessToken;
  
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      type: 'https://api.devflow.ai/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Authentication token is required to access this resource.',
      instance: req.originalUrl,
    });
  }

  const payload = AuthService.verifyAccessToken(token);
  if (!payload) {
    // Try refreshing if refresh token cookie exists
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const refreshPayload = AuthService.verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        const user = await UserModel.findById(refreshPayload.userId);
        if (user) {
          const newAccessToken = AuthService.generateAccessToken(user);
          const newRefreshToken = AuthService.generateRefreshToken(user);
          AuthService.setAuthCookies(res, newAccessToken, newRefreshToken);
          req.user = user;
          await hydrateOrgMembership(req, user);
          return next();
        }
      }
    }

    return res.status(401).json({
      type: 'https://api.devflow.ai/errors/token-expired',
      title: 'Session Expired',
      status: 401,
      detail: 'Your access token has expired. Please log in again.',
      instance: req.originalUrl,
    });
  }

  const user = await UserModel.findById(payload.userId);
  if (!user) {
    return res.status(401).json({
      type: 'https://api.devflow.ai/errors/user-not-found',
      title: 'User Not Found',
      status: 401,
      detail: 'The authenticated user session could not be resolved.',
      instance: req.originalUrl,
    });
  }

  req.user = user;
  (req as any).userId = user._id.toString();
  await hydrateOrgMembership(req, user);
  next();
}

async function hydrateOrgMembership(req: Request, user: IUser) {
  let orgId = (req.headers['x-organization-id'] as string) || (req.query.organizationId as string);

  if (!orgId) {
    // Fall back to first user membership or default organization
    const defaultMembership = await UserMembershipModel.findOne({ userId: user._id });
    if (defaultMembership) {
      orgId = defaultMembership.organizationId.toString();
    } else {
      const defaultOrg = await OrganizationModel.findOne();
      if (defaultOrg) orgId = defaultOrg._id.toString();
    }
  }

  if (orgId) {
    const membership = await UserMembershipModel.findOne({ userId: user._id, organizationId: orgId });
    if (membership) {
      req.orgRole = membership.role;
      req.organizationId = orgId;
      req.membership = membership;
    } else if (user.role === 'SYSTEM_ADMIN') {
      req.orgRole = 'OWNER';
      req.organizationId = orgId;
    }
  }
}

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  let token = req.cookies?.accessToken;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    const payload = AuthService.verifyAccessToken(token);
    if (payload) {
      const user = await UserModel.findById(payload.userId);
      if (user) {
        req.user = user;
        (req as any).userId = user._id.toString();
        await hydrateOrgMembership(req, user);
      }
    }
  }
  next();
}

/**
 * Enforce minimum role or specific roles
 */
export function requireRole(allowedRoles: OrganizationRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        type: 'https://api.devflow.ai/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication is required to access this resource.',
      });
    }

    if (req.user.role === 'SYSTEM_ADMIN') {
      return next();
    }

    const currentRole = req.orgRole || 'DEVELOPER';

    // Normalize DEVELOPER and MEMBER
    const effectiveRoles = allowedRoles.flatMap(r => r === 'DEVELOPER' ? ['DEVELOPER', 'MEMBER'] : [r]);

    if (effectiveRoles.includes(currentRole)) {
      return next();
    }

    return res.status(403).json({
      type: 'https://api.devflow.ai/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: `Your role (${currentRole}) lacks permission. Requires one of: [${allowedRoles.join(', ')}].`,
      instance: req.originalUrl,
    });
  };
}

/**
 * Enforce fine-grained functional permission
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        type: 'https://api.devflow.ai/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication is required.',
      });
    }

    if (req.user.role === 'SYSTEM_ADMIN') {
      return next();
    }

    const currentRole = req.orgRole || 'DEVELOPER';
    const grantedPermissions = ROLE_PERMISSIONS[currentRole] || [];

    if (grantedPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      type: 'https://api.devflow.ai/errors/forbidden',
      title: 'Insufficient Permissions',
      status: 403,
      detail: `Action requires '${permission}'. Your role is '${currentRole}'.`,
      instance: req.originalUrl,
    });
  };
}

/**
 * Scoped repository access check
 */
export function checkRepositoryAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role === 'SYSTEM_ADMIN' || req.orgRole === 'OWNER' || req.orgRole === 'ADMIN') {
    return next();
  }

  const repoId = req.params.id || req.params.repositoryId || req.body?.repositoryId;
  if (!repoId) return next();

  if (req.membership && req.membership.repositoryAccess === 'SELECTED') {
    const isAllowed = req.membership.allowedRepositories.some(
      (id) => id.toString() === repoId.toString()
    );

    if (!isAllowed) {
      return res.status(403).json({
        type: 'https://api.devflow.ai/errors/forbidden',
        title: 'Repository Access Restricted',
        status: 403,
        detail: 'You do not have access permissions for this specific repository.',
        instance: req.originalUrl,
      });
    }
  }

  next();
}

// Backward compatibility aliases
export const authMiddleware = authenticate;
export const authorize = (roles: Array<'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'SYSTEM_ADMIN'>) =>
  requireRole(roles.map((r) => (r === 'MEMBER' ? 'DEVELOPER' : (r as any))));
