export type UserRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER' | 'SYSTEM_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  organizationId?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  ownerId: string;
}

export interface Repository {
  id: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  language: string;
  totalIssues: number;
  criticalIssues: number;
  qualityScore: number;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  filePath: string;
  lineNumber: number;
  endLineNumber?: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'SECURITY' | 'PERFORMANCE' | 'MAINTAINABILITY' | 'BUG' | 'STYLE';
  suggestedFix?: string;
  status: 'OPEN' | 'RESOLVED' | 'FALSE_POSITIVE' | 'ACCEPTED_RISK' | 'NOT_APPLICABLE';
}

export interface BackgroundJob {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
