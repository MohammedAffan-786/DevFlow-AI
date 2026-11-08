import { z } from 'zod';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  CreateOrganizationSchema,
  InviteMemberSchema,
  ConnectRepoSchema,
  UpdateRepoSettingsSchema,
  GenerateTestRequestSchema,
  ExecuteTestRequestSchema,
  TriggerScanRequestSchema,
  UpdateIssueStatusSchema,
  ExplainCodeSchema,
  ComplexityAnalysisSchema
} from '../schemas';

export type UserRole = 'SYSTEM_ADMIN' | 'USER';
export type OrgPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type PRState = 'OPEN' | 'CLOSED' | 'MERGED';
export type AnalysisStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type IssueType = 'SECURITY_VULNERABILITY' | 'BUG' | 'CODE_SMELL' | 'PERFORMANCE_ISSUE';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type FindingCategory =
  | 'LOGICAL_ERROR'
  | 'RUNTIME_ERROR'
  | 'NULL_POINTER'
  | 'EXCEPTION_HANDLING'
  | 'CODE_DUPLICATION'
  | 'CODE_SMELL'
  | 'PERFORMANCE'
  | 'RESOURCE_LEAK'
  | 'INPUT_VALIDATION'
  | 'SECURITY';

export type EvidenceStatus = 'CONFIRMED' | 'SUSPECTED' | 'INSUFFICIENT_EVIDENCE';
export type IssueStatus = 'OPEN' | 'RESOLVED' | 'FALSE_POSITIVE' | 'IGNORED';
export type TestFramework = 'pytest' | 'jest' | 'vitest';
export type TestCaseStatus = 'GENERATED' | 'EXECUTING' | 'PASSED' | 'FAILED' | 'SYNTAX_ERROR';
export type SandboxRuntime = 'python:3.11' | 'node:20';

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordSchema>;
export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationSchema>;
export type InviteMemberRequest = z.infer<typeof InviteMemberSchema>;
export type ConnectRepoRequest = z.infer<typeof ConnectRepoSchema>;
export type UpdateRepoSettingsRequest = z.infer<typeof UpdateRepoSettingsSchema>;
export type GenerateTestRequest = z.infer<typeof GenerateTestRequestSchema>;
export type ExecuteTestRequest = z.infer<typeof ExecuteTestRequestSchema>;
export type TriggerScanRequest = z.infer<typeof TriggerScanRequestSchema>;
export type UpdateIssueStatusRequest = z.infer<typeof UpdateIssueStatusSchema>;
export type ExplainCodeRequest = z.infer<typeof ExplainCodeSchema>;
export type ComplexityAnalysisRequest = z.infer<typeof ComplexityAnalysisSchema>;

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  correlationId?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export interface UserDTO {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  isEmailVerified: boolean;
  githubConnected: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: MembershipRole;
  };
}

export interface Finding {
  findingId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  severity: SeverityLevel;
  category: FindingCategory;
  description: string;
  explanation: string;
  whyItMatters: string;
  suggestedFix: string;
  correctedCodeExample: string;
  confidenceScore: number; // 0.0 - 1.0
  evidenceStatus: EvidenceStatus;
  cweId?: string;
  owaspCategory?: string;
}

export interface GitBranch {
  name: string;
  commitSha: string;
  isDefault: boolean;
  protected?: boolean;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  authorAvatar?: string;
  date: string;
}

export interface RepoFileNode {
  path: string;
  name: string;
  type: 'blob' | 'tree';
  size?: number;
  language?: string;
  children?: RepoFileNode[];
}

export interface CodeExplanationResult {
  simpleExplanation: string;
  purpose: string;
  functionByFunction: Array<{
    name: string;
    lineRange: string;
    purpose: string;
    inputs: string[];
    outputs: string;
  }>;
  inputsAndOutputs: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  dependencies: Array<{
    name: string;
    type: string;
    purpose: string;
  }>;
  potentialProblems: Array<{
    issue: string;
    impact: string;
    severity: string;
  }>;
  improvementSuggestions: Array<{
    suggestion: string;
    benefit: string;
    codeSnippet?: string;
  }>;
}

export interface ComplexityAnalysisResult {
  functionName: string;
  startLine: number;
  endLine: number;
  estimatedTimeComplexity: string;
  estimatedSpaceComplexity: string;
  explanation: string;
  inefficientLoops: Array<{
    line: number;
    type: string;
    description: string;
  }>;
  optimizationSuggestions: Array<{
    title: string;
    explanation: string;
    beforeCode: string;
    afterCode: string;
    timeComplexityBefore: string;
    timeComplexityAfter: string;
  }>;
  distinctionNote: string;
}

export interface RepositoryAnalysisReport {
  reportId: string;
  repository: {
    id: string;
    name: string;
    fullName: string;
    branch: string;
    commitSha: string;
  };
  overview: {
    scanDate: string;
    durationMs: number;
    overallScore: number;
    securityGrade: string;
    status: AnalysisStatus;
  };
  languagesDetected: Array<{
    language: string;
    byteCount: number;
    percentage: number;
    fileCount: number;
  }>;
  totalFilesAnalyzed: number;
  filesSkipped: Array<{
    path: string;
    reason: string;
  }>;
  issuesBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  findings: Finding[];
  securityFindings: Finding[];
  performanceSuggestions: Array<{
    title: string;
    description: string;
    filePath: string;
    line: number;
  }>;
  complexitySummary: {
    averageCyclomatic: number;
    highRiskFunctionsCount: number;
  };
  recommendedImprovements: string[];
}

export interface DashboardStatsDTO {
  totalRepositories: number;
  totalCodeReviews: number;
  bugsDetected: number;
  criticalSecurityVulnerabilities: number;
  testsGenerated: number;
  testsPassed: number;
  testsFailed: number;
  averageCodeQualityScore: number;
  recentActivity: Array<{
    id: string;
    repoName: string;
    commitSha: string;
    branch: string;
    status: AnalysisStatus;
    findingsCount: number;
    createdAt: string;
  }>;
  repositoryHealth: Array<{
    id: string;
    name: string;
    fullName: string;
    healthScore: number;
    language: string;
    lastScannedAt?: string;
  }>;
  codeQualityTrends: Array<{
    date: string;
    qualityScore: number;
    bugsCount: number;
    vulnCount: number;
  }>;
}

// ─── Automated Testing Engine Types ──────────────────────────────────────────

export type TestCategory =
  | 'NORMAL'
  | 'BOUNDARY'
  | 'EDGE_CASE'
  | 'INVALID_INPUT'
  | 'EXCEPTION'
  | 'REGRESSION';

export interface GeneratedTestCase {
  id: string;
  name: string;
  description: string;
  category: TestCategory;
  inputDescription: string;
  expectedOutput: string;
  assertions: string[];
  code: string;
}

export interface GeneratedTestFile {
  fileName: string;
  filePath: string;
  targetFilePath: string;
  language: 'python' | 'javascript' | 'typescript';
  framework: 'pytest' | 'jest' | 'vitest';
  testCases: GeneratedTestCase[];
  fullCode: string;
}

export interface SandboxSecuritySpec {
  runAsUser: string;
  networkMode: 'none' | 'bridge';
  cpuLimit: number;
  memoryLimitMb: number;
  timeoutSeconds: number;
  pidsLimit: number;
  readonlyRootfs: boolean;
  tmpfsMounts: string[];
  droppedCapabilities: string[];
  seccompProfileApplied: boolean;
  noNewPrivileges: boolean;
  isolationEngine: 'docker' | 'gvisor' | 'isolated-process';
}

export interface FailedAssertion {
  testName: string;
  expected: string;
  actual: string;
  message: string;
  stackTrace?: string;
  filePath?: string;
  line?: number;
}

export interface TestCoverageMetrics {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface TestExecutionResultDTO {
  runId: string;
  status: 'PASSED' | 'FAILED' | 'TIMED_OUT' | 'ERROR';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  durationMs: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  errorMessages: string[];
  stackTraces: string[];
  failedAssertions: FailedAssertion[];
  coverage?: TestCoverageMetrics;
  securitySpec: SandboxSecuritySpec;
}

export interface TestReportDTO {
  whatWasTested: string[];
  whatPassed: string[];
  whatFailed: string[];
  whyTestsFailed: Array<{
    testName: string;
    reason: string;
    error: string;
    failedAssertion?: string;
  }>;
  suggestedFixes: Array<{
    testName: string;
    fix: string;
    diff: string;
    targetFile: string;
  }>;
  coverageLimitations: string[];
  recommendedAdditionalTests: string[];
}

export interface TestRunHistoryItem {
  runId: string;
  repositoryId: string;
  repositoryName?: string;
  commitSha: string;
  branch: string;
  framework: TestFramework;
  targetFilePath: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  status: 'PASSED' | 'FAILED' | 'TIMED_OUT';
  createdAt: string;
}
