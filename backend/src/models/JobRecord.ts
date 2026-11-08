import { Schema, model, Document, Types } from 'mongoose';

export type JobType =
  | 'REPO_IMPORT'
  | 'REPO_ANALYSIS'
  | 'AI_CODE_REVIEW'
  | 'SECURITY_SCAN'
  | 'TEST_GENERATION'
  | 'TEST_EXECUTION'
  | 'PULL_REQUEST_REVIEW'
  | 'REPORT_GENERATION';

export type JobStatus =
  | 'PENDING'
  | 'WAITING'
  | 'ACTIVE'
  | 'PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'DEAD_LETTER';

export interface IJobRecord extends Document {
  _id: Types.ObjectId;
  jobId: string;
  type: JobType;
  status: JobStatus;
  priority: number; // 1 (High: PR, Security) -> 5 (Normal: Analysis, Tests) -> 10 (Low: Batch, Reports)
  organizationId?: Types.ObjectId;
  repositoryId?: Types.ObjectId;
  userId?: Types.ObjectId;
  dedupKey?: string;
  progress: {
    percentage: number;
    stage: string;
    details?: string;
    updatedAt: Date;
  };
  retryPolicy: {
    attemptsMade: number;
    maxAttempts: number;
    backoffType: 'exponential' | 'fixed';
    backoffDelayMs: number;
  };
  payload: Record<string, any>;
  result?: Record<string, any>;
  failure?: {
    reason: string;
    stackTrace?: string;
    failedAt: Date;
  };
  deadLetter?: {
    isDeadLetter: boolean;
    reason?: string;
    movedAt?: Date;
    replayedAt?: Date;
    replayCount?: number;
  };
  enqueuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobRecordSchema = new Schema<IJobRecord>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: [
        'REPO_IMPORT',
        'REPO_ANALYSIS',
        'AI_CODE_REVIEW',
        'SECURITY_SCAN',
        'TEST_GENERATION',
        'TEST_EXECUTION',
        'PULL_REQUEST_REVIEW',
        'REPORT_GENERATION',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'WAITING',
        'ACTIVE',
        'PROGRESS',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'DEAD_LETTER',
      ],
      default: 'PENDING',
      index: true,
    },
    priority: { type: Number, default: 5, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    dedupKey: { type: String, index: true },
    progress: {
      percentage: { type: Number, default: 0 },
      stage: { type: String, default: 'Queued' },
      details: { type: String, default: '' },
      updatedAt: { type: Date, default: Date.now },
    },
    retryPolicy: {
      attemptsMade: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 },
      backoffType: { type: String, default: 'exponential' },
      backoffDelayMs: { type: Number, default: 2000 },
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    result: { type: Schema.Types.Mixed },
    failure: {
      reason: { type: String },
      stackTrace: { type: String },
      failedAt: { type: Date },
    },
    deadLetter: {
      isDeadLetter: { type: Boolean, default: false, index: true },
      reason: { type: String },
      movedAt: { type: Date },
      replayedAt: { type: Date },
      replayCount: { type: Number, default: 0 },
    },
    enqueuedAt: { type: Date, default: Date.now, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

JobRecordSchema.index({ type: 1, status: 1 });
JobRecordSchema.index({ dedupKey: 1, status: 1 });

export const JobRecordModel = model<IJobRecord>('JobRecord', JobRecordSchema);
