import { Schema, model, Document, Types } from 'mongoose';

export interface IAnalysisRun extends Document {
  _id: Types.ObjectId;
  repositoryId: Types.ObjectId;
  pullRequestId?: Types.ObjectId;
  trigger: 'WEBHOOK_PR' | 'WEBHOOK_PUSH' | 'MANUAL_UI' | 'API_TRIGGER';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  commitSha: string;
  branch: string;
  metrics: {
    bugsFound: number;
    vulnerabilitiesFound: number;
    codeSmellsFound: number;
    securityCriticalCount: number;
    qualityScore: number;
    cyclomaticComplexityAvg: number;
  };
  durationMs: number;
  tokenUsage: {
    totalTokens: number;
    estimatedCostUsd: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisRunSchema = new Schema<IAnalysisRun>(
  {
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    pullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest', default: null, index: true },
    trigger: {
      type: String,
      enum: ['WEBHOOK_PR', 'WEBHOOK_PUSH', 'MANUAL_UI', 'API_TRIGGER'],
      default: 'MANUAL_UI',
      required: true,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'],
      default: 'QUEUED',
      required: true,
      index: true,
    },
    commitSha: { type: String, required: true },
    branch: { type: String, default: 'main' },
    metrics: {
      bugsFound: { type: Number, default: 0 },
      vulnerabilitiesFound: { type: Number, default: 0 },
      codeSmellsFound: { type: Number, default: 0 },
      securityCriticalCount: { type: Number, default: 0 },
      qualityScore: { type: Number, default: 100 },
      cyclomaticComplexityAvg: { type: Number, default: 1 },
    },
    durationMs: { type: Number, default: 0 },
    tokenUsage: {
      totalTokens: { type: Number, default: 0 },
      estimatedCostUsd: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

AnalysisRunSchema.index({ repositoryId: 1, createdAt: -1 });

export const AnalysisRunModel = model<IAnalysisRun>('AnalysisRun', AnalysisRunSchema);
