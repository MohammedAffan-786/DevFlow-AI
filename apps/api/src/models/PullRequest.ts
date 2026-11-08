import { Schema, model, Document, Types } from 'mongoose';

export interface IPullRequest extends Document {
  _id: Types.ObjectId;
  repositoryId: Types.ObjectId;
  prNumber: number;
  title: string;
  headSha: string;
  baseSha: string;
  headBranch: string;
  baseBranch: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  authorUsername: string;
  authorAvatarUrl: string;
  changedFilesCount: number;
  additions: number;
  deletions: number;
  latestAnalysisRunId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PullRequestSchema = new Schema<IPullRequest>(
  {
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    prNumber: { type: Number, required: true },
    title: { type: String, required: true },
    headSha: { type: String, required: true },
    baseSha: { type: String, required: true },
    headBranch: { type: String, required: true },
    baseBranch: { type: String, required: true },
    state: { type: String, enum: ['OPEN', 'CLOSED', 'MERGED'], default: 'OPEN', required: true },
    authorUsername: { type: String, required: true },
    authorAvatarUrl: { type: String, default: '' },
    changedFilesCount: { type: Number, default: 0 },
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    latestAnalysisRunId: { type: Schema.Types.ObjectId, ref: 'AnalysisRun', default: null },
  },
  { timestamps: true }
);

PullRequestSchema.index({ repositoryId: 1, prNumber: 1 }, { unique: true });

export const PullRequestModel = model<IPullRequest>('PullRequest', PullRequestSchema);
