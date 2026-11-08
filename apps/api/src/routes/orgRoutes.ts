import { Router, Request, Response } from 'express';
import { OrganizationModel } from '../models/Organization';
import { UserMembershipModel, OrganizationRole } from '../models/UserMembership';
import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLog';
import { optionalAuthenticate, authenticate, requireRole } from '../middlewares/authMiddleware';
import { AuditService } from '../services/auditService';
import { Types } from 'mongoose';

const router = Router();

// GET /api/v1/organizations (Current Org)
router.get('/', optionalAuthenticate, async (_req: Request, res: Response) => {
  const org = await OrganizationModel.findOne();
  if (!org) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/not-found',
      title: 'Organization Not Found',
      status: 404,
      detail: 'No organization configured.',
    });
  }

  const memberCount = await UserMembershipModel.countDocuments({ organizationId: org._id });

  res.status(200).json({
    success: true,
    data: {
      organization: org,
      memberCount,
    },
  });
});

// POST /api/v1/organizations - Create a new organization (Creator becomes OWNER)
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { name, billingEmail, plan = 'PRO' } = req.body;

  if (!name || !billingEmail) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/validation-error',
      title: 'Missing Required Fields',
      status: 400,
      detail: 'Name and billing email are required.',
    });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  
  const org = await OrganizationModel.create({
    name,
    slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
    billingEmail,
    plan,
    limits: {
      maxRepositories: plan === 'ENTERPRISE' ? 100 : 25,
      maxMonthlyScans: plan === 'ENTERPRISE' ? 10000 : 2500,
      maxConcurrentSandboxes: plan === 'ENTERPRISE' ? 10 : 4,
    },
  });

  // Assign current user as OWNER
  if (req.user) {
    await UserMembershipModel.create({
      organizationId: org._id,
      userId: req.user._id,
      role: 'OWNER',
      repositoryAccess: 'ALL',
    });
  }

  await AuditService.logAdmin(req.user, 'ORGANIZATION_CREATED', {
    orgId: org._id,
    name: org.name,
    plan: org.plan,
  });

  res.status(201).json({
    success: true,
    data: org,
    message: 'Organization created successfully.',
  });
});

// GET /api/v1/organizations/members - List members
router.get('/members', optionalAuthenticate, async (_req: Request, res: Response) => {
  const org = await OrganizationModel.findOne();
  if (!org) return res.status(200).json({ success: true, data: [] });

  const memberships = await UserMembershipModel.find({ organizationId: org._id })
    .populate('userId')
    .populate('allowedRepositories');

  const members = memberships.map((m: any) => ({
    id: m._id.toString(),
    userId: m.userId?._id?.toString(),
    displayName: m.userId?.displayName || 'Developer',
    email: m.userId?.email || 'dev@acme.com',
    avatarUrl: m.userId?.avatarUrl,
    role: m.role === 'MEMBER' ? 'DEVELOPER' : m.role,
    repositoryAccess: m.repositoryAccess || 'ALL',
    allowedRepositories: m.allowedRepositories || [],
    joinedAt: m.joinedAt,
  }));

  res.status(200).json({ success: true, data: members });
});

// POST /api/v1/organizations/members/invite - Team Invitation
router.post('/members/invite', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { email, role = 'DEVELOPER', repositoryAccess = 'ALL', allowedRepositories = [] } = req.body;
  const org = await OrganizationModel.findOne();
  if (!org) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/not-found',
      title: 'Organization Not Found',
      status: 404,
      detail: 'Organization not found.',
    });
  }

  // Find or create placeholder user for invitee
  let user = await UserModel.findOne({ email });
  if (!user) {
    user = await UserModel.create({
      email,
      username: email.split('@')[0],
      displayName: email.split('@')[0],
      passwordHash: 'pending_invite',
      isEmailVerified: false,
    });
  }

  const existingMember = await UserMembershipModel.findOne({ organizationId: org._id, userId: user._id });
  if (existingMember) {
    return res.status(409).json({
      type: 'https://api.devflow.ai/errors/conflict',
      title: 'Already a Member',
      status: 409,
      detail: 'This user is already a member of the organization.',
    });
  }

  const normalizedRole: OrganizationRole = role === 'MEMBER' ? 'DEVELOPER' : role;

  const membership = await UserMembershipModel.create({
    organizationId: org._id,
    userId: user._id,
    role: normalizedRole,
    repositoryAccess,
    allowedRepositories: allowedRepositories.map((id: string) => new Types.ObjectId(id)),
    invitedBy: req.user?._id,
  });

  await AuditService.logPermission(req.user, user, 'MEMBER_INVITED', {
    email,
    role: normalizedRole,
    repositoryAccess,
  });

  res.status(201).json({
    success: true,
    data: membership,
    message: `Invitation successfully sent to ${email} as ${normalizedRole}.`,
  });
});

// PUT /api/v1/organizations/members/:memberId/role - Role Assignment
router.put('/members/:memberId/role', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { role } = req.body;
  const { memberId } = req.params;

  if (!['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'].includes(role)) {
    return res.status(400).json({
      type: 'https://api.devflow.ai/errors/invalid-role',
      title: 'Invalid Role',
      status: 400,
      detail: 'Allowed roles are OWNER, ADMIN, DEVELOPER, VIEWER.',
    });
  }

  // Only OWNER can assign OWNER role
  if (role === 'OWNER' && req.orgRole !== 'OWNER' && req.user?.role !== 'SYSTEM_ADMIN') {
    return res.status(403).json({
      type: 'https://api.devflow.ai/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'Only organization Owners can transfer or assign Owner privileges.',
    });
  }

  const membership = await UserMembershipModel.findById(memberId).populate('userId');
  if (!membership) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/member-not-found',
      title: 'Member Not Found',
      status: 404,
      detail: 'Membership record not found.',
    });
  }

  const oldRole = membership.role;
  membership.role = role;
  await membership.save();

  await AuditService.logPermission(req.user, membership.userId, 'ROLE_UPDATED', {
    oldRole,
    newRole: role,
  });

  res.status(200).json({
    success: true,
    message: `Role updated to ${role}.`,
    data: membership,
  });
});

// PUT /api/v1/organizations/members/:memberId/repos - Repository Access Permissions
router.put('/members/:memberId/repos', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const { repositoryAccess, allowedRepositories } = req.body;
  const { memberId } = req.params;

  const membership = await UserMembershipModel.findById(memberId).populate('userId');
  if (!membership) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/member-not-found',
      title: 'Member Not Found',
      status: 404,
      detail: 'Membership record not found.',
    });
  }

  membership.repositoryAccess = repositoryAccess === 'SELECTED' ? 'SELECTED' : 'ALL';
  membership.allowedRepositories = (allowedRepositories || []).map((id: string) => new Types.ObjectId(id));
  await membership.save();

  await AuditService.logPermission(req.user, membership.userId, 'REPO_ACCESS_MODIFIED', {
    repositoryAccess: membership.repositoryAccess,
    allowedRepositoriesCount: membership.allowedRepositories.length,
  });

  res.status(200).json({
    success: true,
    message: 'Repository access permissions updated.',
    data: membership,
  });
});

// DELETE /api/v1/organizations/members/:memberId - Member Removal
router.delete('/members/:memberId', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: Request, res: Response) => {
  const membership = await UserMembershipModel.findById(req.params.memberId).populate('userId');
  if (!membership) {
    return res.status(404).json({
      type: 'https://api.devflow.ai/errors/not-found',
      title: 'Member Not Found',
      status: 404,
      detail: 'Membership record not found.',
    });
  }

  // Prevent deleting the sole OWNER
  if (membership.role === 'OWNER') {
    const ownerCount = await UserMembershipModel.countDocuments({
      organizationId: membership.organizationId,
      role: 'OWNER',
    });
    if (ownerCount <= 1) {
      return res.status(400).json({
        type: 'https://api.devflow.ai/errors/sole-owner',
        title: 'Cannot Remove Sole Owner',
        status: 400,
        detail: 'Organization must have at least one active Owner. Transfer ownership first.',
      });
    }
  }

  await UserMembershipModel.findByIdAndDelete(req.params.memberId);

  await AuditService.logPermission(req.user, membership.userId, 'MEMBER_REMOVED', {
    memberId: req.params.memberId,
  });

  res.status(200).json({ success: true, message: 'Member removed from organization.' });
});

// GET /api/v1/organizations/activity - Shared activity feed
router.get('/activity', authenticate, async (req: Request, res: Response) => {
  const org = await OrganizationModel.findOne();
  if (!org) return res.status(200).json({ success: true, data: [] });

  const activities = await AuditLogModel.find({ organizationId: org._id })
    .sort({ timestamp: -1 })
    .limit(30)
    .lean();

  res.status(200).json({
    success: true,
    data: activities,
  });
});

export default router;
