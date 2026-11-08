import mongoose, { Schema, Document } from 'mongoose';

export type FindingClassification =
  | 'FALSE_POSITIVE'
  | 'ACCEPTED_RISK'
  | 'NOT_APPLICABLE'
  | 'ALREADY_FIXED'
  | 'NEEDS_INVESTIGATION';

export interface IFindingFeedback extends Document {
  findingId: string;
  repositoryId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userEmail?: string;
  classification: FindingClassification;
  explanation?: string;
  originalFinding: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const FindingFeedbackSchema = new Schema<IFindingFeedback>(
  {
    findingId: { type: String, required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userEmail: { type: String },
    classification: {
      type: String,
      enum: [
        'FALSE_POSITIVE',
        'ACCEPTED_RISK',
        'NOT_APPLICABLE',
        'ALREADY_FIXED',
        'NEEDS_INVESTIGATION',
      ],
      required: true,
      index: true,
    },
    explanation: { type: String, default: '' },
    originalFinding: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

FindingFeedbackSchema.index({ repositoryId: 1, findingId: 1 });

export const FindingFeedbackModel = mongoose.model<IFindingFeedback>(
  'FindingFeedback',
  FindingFeedbackSchema
);
