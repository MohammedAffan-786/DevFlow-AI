import { Schema, model, Document, Types } from 'mongoose';

export type AuditCategory =
  | 'AUTHENTICATION'
  | 'REPOSITORY'
  | 'PERMISSIONS'
  | 'ANALYSIS'
  | 'TESTING'
  | 'INTEGRATION'
  | 'FEEDBACK'
  | 'ADMINISTRATION';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  organizationId?: Types.ObjectId;
  userId?: Types.ObjectId;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
    ipAddress?: string;
    userAgent?: string;
  };
  action: string;
  category: AuditCategory;
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  details: Record<string, any>;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actor: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, default: 'DEVELOPER' },
      ipAddress: { type: String },
      userAgent: { type: String },
    },
    action: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: [
        'AUTHENTICATION',
        'REPOSITORY',
        'PERMISSIONS',
        'ANALYSIS',
        'TESTING',
        'INTEGRATION',
        'FEEDBACK',
        'ADMINISTRATION',
      ],
      required: true,
      index: true,
    },
    resource: {
      type: { type: String, required: true },
      id: { type: String },
      name: { type: String },
    },
    details: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'WARNING'], default: 'SUCCESS', required: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

AuditLogSchema.index({ organizationId: 1, timestamp: -1 });
AuditLogSchema.index({ category: 1, timestamp: -1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', AuditLogSchema);
