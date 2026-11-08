import { z } from 'zod';

export const UserRoleSchema = z.enum(['SYSTEM_ADMIN', 'USER']);

export const OrgPlanSchema = z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']);

export const MembershipRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

export const PRStateSchema = z.enum(['OPEN', 'CLOSED', 'MERGED']);

export const AnalysisStatusSchema = z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']);

export const IssueTypeSchema = z.enum(['SECURITY_VULNERABILITY', 'BUG', 'CODE_SMELL', 'PERFORMANCE_ISSUE']);

export const IssueSeveritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);

export const IssueStatusSchema = z.enum(['OPEN', 'RESOLVED', 'FALSE_POSITIVE', 'IGNORED']);

export const TestFrameworkSchema = z.enum(['jest', 'vitest', 'pytest']);

export const TestCaseStatusSchema = z.enum(['GENERATED', 'EXECUTING', 'PASSED', 'FAILED', 'SYNTAX_ERROR']);

// Auth Schemas
export const RegisterRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const LoginRequestSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required')
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

// Organization Schemas
export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/),
  billingEmail: z.string().email()
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: MembershipRoleSchema.default('MEMBER')
});

// Repository Schemas
export const ConnectRepoSchema = z.object({
  name: z.string().min(1).max(100),
  fullName: z.string().min(3).max(100),
  htmlUrl: z.string().url(),
  defaultBranch: z.string().default('main'),
  isPrivate: z.boolean().default(false),
  primaryLanguage: z.string().default('TypeScript')
});

export const UpdateRepoSettingsSchema = z.object({
  autoReviewPullRequests: z.boolean().optional(),
  failCheckOnHighSeverity: z.boolean().optional(),
  generateTestsAutomatically: z.boolean().optional(),
  targetTestFramework: TestFrameworkSchema.optional(),
  ignoredPaths: z.array(z.string()).optional()
});

// Test Schemas
export const GenerateTestRequestSchema = z.object({
  repositoryId: z.string().min(1, 'Repository ID is required'),
  filePath: z.string().min(1, 'File path is required'),
  functionName: z.string().min(1, 'Function name is required'),
  targetFramework: TestFrameworkSchema,
  mockExternalDependencies: z.boolean().default(true)
});

export const ExecuteTestRequestSchema = z.object({
  testCaseId: z.string().min(1, 'Test case ID is required')
});

export const TriggerScanRequestSchema = z.object({
  branch: z.string().min(1).default('main')
});

export const UpdateIssueStatusSchema = z.object({
  status: IssueStatusSchema,
  reason: z.string().optional()
});

export const ExplainCodeSchema = z.object({
  code: z.string().min(5, 'Code snippet must have at least 5 characters'),
  language: z.string().default('typescript'),
  focus: z.enum(['architecture', 'logic', 'security', 'edge_cases']).default('logic')
});

export const ComplexityAnalysisSchema = z.object({
  code: z.string().min(5, 'Code snippet is required'),
  language: z.string().default('typescript')
});

export const InspectFileSchema = z.object({
  path: z.string().min(1, 'File path is required'),
  branch: z.string().optional()
});

export const SelectBranchSchema = z.object({
  branch: z.string().min(1, 'Branch name is required')
});
