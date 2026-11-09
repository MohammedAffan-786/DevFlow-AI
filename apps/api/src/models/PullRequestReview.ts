import mongoose, { Schema, Document } from 'mongoose';

export interface IPullRequestReview extends Document {
  pullRequestId: mongoose.Types.ObjectId;
  repositoryId: mongoose.Types.ObjectId;
  prNumber: number;
  commitSha: string;
  headBranch: string;
  baseBranch: string;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  verdict: 'APPROVED_WITH_SUGGESTIONS' | 'CHANGES_REQUESTED' | 'NEEDS_SECURITY_TRIAGE' | 'CLEAN';
  overallSummary: string;
  changedFiles: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
  securityFindings: Array<{
    findingId: string;
    filePath: string;
    startLine: number;
    endLine: number;
    severity: string;
    description: string;
    explanation: string;
    whyItMatters: string;
    suggestedFix: string;
    correctedCodeExample?: string;
    cweId?: string;
    owaspCategory?: string;
    confidenceScore: number;
    evidenceStatus: string;
  }>;
  codeQualityFindings: Array<{
    findingId: string;
    filePath: string;
    startLine: number;
    endLine: number;
    severity: string;
    category: string;
    description: string;
    explanation: string;
    whyItMatters: string;
    suggestedFix: string;
    correctedCodeExample?: string;
    confidenceScore: number;
    evidenceStatus: string;
  }>;
  testExecution: {
    status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'TIMED_OUT';
    totalTests: number;
    passedTests: number;
    failedTests: number;
    durationMs: number;
    coveragePercent: number;
    generatedTestFile?: string;
  };
  publishedToGitHub: boolean;
  publishedAt?: Date;
  publishedCommentIds: Array<number | string>;
  createdAt: Date;
  updatedAt: Date;
}

const PullRequestReviewSchema = new Schema<IPullRequestReview>(
  {
    pullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    prNumber: { type: Number, required: true },
    commitSha: { type: String, required: true },
    headBranch: { type: String, required: true },
    baseBranch: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ANALYZING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      required: true,
    },
    verdict: {
      type: String,
      enum: ['APPROVED_WITH_SUGGESTIONS', 'CHANGES_REQUESTED', 'NEEDS_SECURITY_TRIAGE', 'CLEAN'],
      default: 'CLEAN',
    },
    overallSummary: { type: String, default: '' },
    changedFiles: [
      {
        filename: { type: String, required: true },
        status: { type: String, default: 'modified' },
        additions: { type: Number, default: 0 },
        deletions: { type: Number, default: 0 },
        patch: { type: String },
      },
    ],
    securityFindings: { type: [Schema.Types.Mixed], default: [] } as any,
    codeQualityFindings: { type: [Schema.Types.Mixed], default: [] } as any,
    testExecution: {
      status: { type: String, enum: ['PASSED', 'FAILED', 'SKIPPED', 'TIMED_OUT'], default: 'SKIPPED' },
      totalTests: { type: Number, default: 0 },
      passedTests: { type: Number, default: 0 },
      failedTests: { type: Number, default: 0 },
      durationMs: { type: Number, default: 0 },
      coveragePercent: { type: Number, default: 0 },
      generatedTestFile: { type: String },
    },
    publishedToGitHub: { type: Boolean, default: false },
    publishedAt: { type: Date },
    publishedCommentIds: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: true }
);

PullRequestReviewSchema.index({ repositoryId: 1, prNumber: 1, commitSha: 1 });

export const PullRequestReviewModel = mongoose.model<IPullRequestReview>(
  'PullRequestReview',
  PullRequestReviewSchema
);
