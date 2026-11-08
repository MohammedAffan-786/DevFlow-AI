import { AuditLogModel, IAuditLog, AuditCategory } from '../models/AuditLog';
import { Types } from 'mongoose';

export interface AuditLogParams {
  organizationId?: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
  actor: {
    id: string;
    name: string;
    email: string;
    role?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  action: string;
  category: AuditCategory;
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  details?: Record<string, any>;
  status?: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

export class AuditService {
  /**
   * Primary audit logger. Records an immutable audit log entry in MongoDB.
   */
  public static async log(params: AuditLogParams): Promise<IAuditLog | null> {
    try {
      const entry = await AuditLogModel.create({
        organizationId: params.organizationId ? new Types.ObjectId(params.organizationId) : undefined,
        userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
        actor: {
          id: params.actor.id || 'system',
          name: params.actor.name || 'System Worker',
          email: params.actor.email || 'system@devflow.ai',
          role: params.actor.role || 'SYSTEM',
          ipAddress: params.actor.ipAddress,
          userAgent: params.actor.userAgent,
        },
        action: params.action,
        category: params.category,
        resource: params.resource,
        details: params.details || {},
        status: params.status || 'SUCCESS',
        timestamp: new Date(),
      });

      console.log(`[AUDIT] [${params.category}] ${params.action} by ${params.actor.email} on ${params.resource.type}:${params.resource.id || ''}`);
      return entry;
    } catch (error) {
      console.error('[AuditService] Failed to write audit log:', error);
      return null;
    }
  }

  /**
   * Helper to log authentication activity
   */
  public static async logAuth(
    user: { _id?: any; displayName?: string; email?: string; role?: string },
    action: 'LOGIN' | 'LOGOUT' | 'SESSION_REFRESH' | 'LOGIN_FAILED' | 'PASSWORD_RESET',
    req?: any,
    details?: Record<string, any>
  ) {
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress;
    const userAgent = req?.headers?.['user-agent'];

    return this.log({
      userId: user?._id,
      actor: {
        id: user?._id?.toString() || 'anonymous',
        name: user?.displayName || 'Unknown User',
        email: user?.email || 'unknown@devflow.ai',
        role: user?.role || 'DEVELOPER',
        ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
        userAgent: typeof userAgent === 'string' ? userAgent : undefined,
      },
      action,
      category: 'AUTHENTICATION',
      resource: {
        type: 'UserSession',
        id: user?._id?.toString(),
        name: user?.email,
      },
      details,
      status: action === 'LOGIN_FAILED' ? 'FAILURE' : 'SUCCESS',
    });
  }

  /**
   * Helper to log repository operations
   */
  public static async logRepo(
    user: any,
    repo: { _id?: any; name?: string; fullName?: string },
    action: 'REPO_CONNECTED' | 'REPO_DISCONNECTED' | 'REPO_SYNCED' | 'BRANCH_SELECTED',
    details?: Record<string, any>
  ) {
    return this.log({
      userId: user?._id,
      organizationId: user?.organizationId,
      actor: {
        id: user?._id?.toString() || 'system',
        name: user?.displayName || 'User',
        email: user?.email || 'user@devflow.ai',
        role: user?.role || 'DEVELOPER',
      },
      action,
      category: 'REPOSITORY',
      resource: {
        type: 'Repository',
        id: repo?._id?.toString(),
        name: repo?.fullName || repo?.name,
      },
      details,
    });
  }

  /**
   * Helper to log permission changes
   */
  public static async logPermission(
    actorUser: any,
    targetUser: any,
    action: 'ROLE_ASSIGNED' | 'ROLE_UPDATED' | 'MEMBER_INVITED' | 'MEMBER_REMOVED' | 'REPO_ACCESS_MODIFIED',
    details?: Record<string, any>
  ) {
    return this.log({
      userId: actorUser?._id,
      organizationId: actorUser?.organizationId,
      actor: {
        id: actorUser?._id?.toString() || 'admin',
        name: actorUser?.displayName || 'Admin',
        email: actorUser?.email || 'admin@devflow.ai',
        role: actorUser?.orgRole || actorUser?.role || 'ADMIN',
      },
      action,
      category: 'PERMISSIONS',
      resource: {
        type: 'UserMembership',
        id: targetUser?._id?.toString(),
        name: targetUser?.email || targetUser?.displayName,
      },
      details,
    });
  }

  /**
   * Helper to log analysis requests
   */
  public static async logAnalysis(
    user: any,
    repo: any,
    analysisId: string,
    action: 'ANALYSIS_QUEUED' | 'ANALYSIS_STARTED' | 'ANALYSIS_COMPLETED' | 'ANALYSIS_FAILED' | 'ANALYSIS_CANCELLED',
    details?: Record<string, any>
  ) {
    return this.log({
      userId: user?._id,
      organizationId: user?.organizationId,
      actor: {
        id: user?._id?.toString() || 'system',
        name: user?.displayName || 'Developer',
        email: user?.email || 'dev@devflow.ai',
        role: user?.orgRole || 'DEVELOPER',
      },
      action,
      category: 'ANALYSIS',
      resource: {
        type: 'AnalysisRun',
        id: analysisId,
        name: repo?.fullName || repo?.name || 'Repository',
      },
      details,
      status: action === 'ANALYSIS_FAILED' ? 'FAILURE' : 'SUCCESS',
    });
  }

  /**
   * Helper to log test execution requests
   */
  public static async logTesting(
    user: any,
    repo: any,
    testRunId: string,
    action: 'TEST_GENERATION_QUEUED' | 'TEST_EXECUTION_QUEUED' | 'TEST_RUN_COMPLETED' | 'TEST_RUN_FAILED',
    details?: Record<string, any>
  ) {
    return this.log({
      userId: user?._id,
      organizationId: user?.organizationId,
      actor: {
        id: user?._id?.toString() || 'system',
        name: user?.displayName || 'Developer',
        email: user?.email || 'dev@devflow.ai',
        role: user?.orgRole || 'DEVELOPER',
      },
      action,
      category: 'TESTING',
      resource: {
        type: 'TestRun',
        id: testRunId,
        name: repo?.fullName || repo?.name || 'Test Suite',
      },
      details,
      status: action === 'TEST_RUN_FAILED' ? 'FAILURE' : 'SUCCESS',
    });
  }

  /**
   * Helper to log feedback/triage actions
   */
  public static async logFeedback(
    user: any,
    findingId: string,
    action: 'FINDING_TRIAGED' | 'FALSE_POSITIVE_REPORTED' | 'RISK_ACCEPTED',
    details?: Record<string, any>
  ) {
    return this.log({
      userId: user?._id,
      organizationId: user?.organizationId,
      actor: {
        id: user?._id?.toString() || 'system',
        name: user?.displayName || 'Developer',
        email: user?.email || 'dev@devflow.ai',
        role: user?.orgRole || 'DEVELOPER',
      },
      action,
      category: 'FEEDBACK',
      resource: {
        type: 'Finding',
        id: findingId,
      },
      details,
    });
  }

  /**
   * Helper to log administrative actions
   */
  public static async logAdmin(
    user: any,
    action: 'ORGANIZATION_CREATED' | 'SETTINGS_UPDATED' | 'BILLING_UPDATED' | 'INTEGRATION_CONFIGURED',
    details?: Record<string, any>
  ) {
    return this.log({
      userId: user?._id,
      organizationId: user?.organizationId,
      actor: {
        id: user?._id?.toString() || 'admin',
        name: user?.displayName || 'Owner',
        email: user?.email || 'owner@devflow.ai',
        role: user?.orgRole || 'OWNER',
      },
      action,
      category: 'ADMINISTRATION',
      resource: {
        type: 'Organization',
        id: user?.organizationId?.toString(),
      },
      details,
    });
  }
}
