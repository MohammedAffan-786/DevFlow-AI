import { Schema, model, Document, Types } from 'mongoose';

export interface IIssue extends Document {
  _id: Types.ObjectId;
  analysisRunId: Types.ObjectId;
  repositoryId: Types.ObjectId;
  pullRequestId?: Types.ObjectId;
  type: 'SECURITY_VULNERABILITY' | 'BUG' | 'CODE_SMELL' | 'PERFORMANCE_ISSUE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'OPEN' | 'RESOLVED' | 'FALSE_POSITIVE' | 'IGNORED';
  title: string;
  description: string;
  location: {
    filePath: string;
    startLine: number;
    endLine: number;
    snippet: string;
  };
  cweId?: string;
  owaspCategory?: string;
  suggestedFixDiff?: string;
  suggestedFixExplanation?: string;
  fingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema = new Schema<IIssue>(
  {
    analysisRunId: { type: Schema.Types.ObjectId, ref: 'AnalysisRun', required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    pullRequestId: { type: Schema.Types.ObjectId, ref: 'PullRequest', default: null, index: true },
    type: {
      type: String,
      enum: ['SECURITY_VULNERABILITY', 'BUG', 'CODE_SMELL', 'PERFORMANCE_ISSUE'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'RESOLVED', 'FALSE_POSITIVE', 'IGNORED'],
      default: 'OPEN',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    location: {
      filePath: { type: String, required: true },
      startLine: { type: Number, required: true },
      endLine: { type: Number, required: true },
      snippet: { type: String, required: true },
    },
    cweId: { type: String, default: null },
    owaspCategory: { type: String, default: null },
    suggestedFixDiff: { type: String, default: null },
    suggestedFixExplanation: { type: String, default: null },
    fingerprint: { type: String, required: true },
  },
  { timestamps: true }
);

IssueSchema.index({ repositoryId: 1, status: 1, severity: 1 });

export const IssueModel = model<IIssue>('Issue', IssueSchema);
