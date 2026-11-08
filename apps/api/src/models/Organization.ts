import { Schema, model, Document, Types } from 'mongoose';

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  billingEmail: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  limits: {
    maxRepositories: number;
    maxMonthlyScans: number;
    maxConcurrentSandboxes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    billingEmail: { type: String, required: true, lowercase: true, trim: true },
    plan: { type: String, enum: ['FREE', 'STARTER', 'PRO', 'ENTERPRISE'], default: 'FREE', required: true },
    limits: {
      maxRepositories: { type: Number, default: 5 },
      maxMonthlyScans: { type: Number, default: 100 },
      maxConcurrentSandboxes: { type: Number, default: 2 },
    },
  },
  { timestamps: true }
);

export const OrganizationModel = model<IOrganization>('Organization', OrganizationSchema);
