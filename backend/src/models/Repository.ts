import { Schema, model, Document, Types } from 'mongoose';

export interface IRepository extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  githubRepoId?: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  isPrivate: boolean;
  primaryLanguage: string;
  healthScore: number;
  scanSettings: {
    autoReviewPullRequests: boolean;
    autoPublishComments: boolean;
    failCheckOnHighSeverity: boolean;
    generateTestsAutomatically: boolean;
    targetTestFramework: 'jest' | 'vitest' | 'pytest';
    ignoredPaths: string[];
  };
  lastScannedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RepositorySchema = new Schema<IRepository>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    githubRepoId: { type: Number, default: null, sparse: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true, index: true },
    htmlUrl: { type: String, required: true },
    defaultBranch: { type: String, default: 'main' },
    isPrivate: { type: Boolean, default: false },
    primaryLanguage: { type: String, default: 'TypeScript' },
    healthScore: { type: Number, default: 92, min: 0, max: 100 },
    scanSettings: {
      autoReviewPullRequests: { type: Boolean, default: true },
      autoPublishComments: { type: Boolean, default: false },
      failCheckOnHighSeverity: { type: Boolean, default: true },
      generateTestsAutomatically: { type: Boolean, default: false },
      targetTestFramework: { type: String, enum: ['jest', 'vitest', 'pytest'], default: 'vitest' },
      ignoredPaths: { type: [String], default: ['node_modules', 'dist', '.git'] },
    },
    lastScannedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

RepositorySchema.index({ organizationId: 1, isDeleted: 1 });

export const RepositoryModel = model<IRepository>('Repository', RepositorySchema);
