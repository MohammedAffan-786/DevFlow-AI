import mongoose, { Schema, Document } from 'mongoose';

export interface IWebhookEvent extends Document {
  deliveryId: string;
  eventType: string;
  action: string;
  repositoryFullName: string;
  repositoryId?: mongoose.Types.ObjectId;
  status: 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'DUPLICATE' | 'FAILED';
  payloadSummary: {
    prNumber?: number;
    sender?: string;
    headSha?: string;
    action?: string;
  };
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    deliveryId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    action: { type: String, required: true },
    repositoryFullName: { type: String, required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository' },
    status: {
      type: String,
      enum: ['RECEIVED', 'PROCESSING', 'COMPLETED', 'DUPLICATE', 'FAILED'],
      default: 'RECEIVED',
      required: true,
      index: true,
    },
    payloadSummary: {
      prNumber: { type: Number },
      sender: { type: String },
      headSha: { type: String },
      action: { type: String },
    },
    errorMessage: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

WebhookEventSchema.index({ repositoryFullName: 1, 'payloadSummary.prNumber': 1 });

export const WebhookEventModel = mongoose.model<IWebhookEvent>(
  'WebhookEvent',
  WebhookEventSchema
);
