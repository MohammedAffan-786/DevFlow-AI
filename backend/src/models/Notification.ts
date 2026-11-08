import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'SECURITY_ALERT'
  | 'SCAN_COMPLETED'
  | 'PR_REVIEW'
  | 'TEAM_INVITE'
  | 'ANALYSIS_COMPLETED'
  | 'CRITICAL_BUG'
  | 'CRITICAL_SECURITY'
  | 'TEST_COMPLETED'
  | 'PR_REVIEW_COMPLETED'
  | 'JOB_FAILED';

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    type: {
      type: String,
      enum: [
        'SECURITY_ALERT',
        'SCAN_COMPLETED',
        'PR_REVIEW',
        'TEAM_INVITE',
        'ANALYSIS_COMPLETED',
        'CRITICAL_BUG',
        'CRITICAL_SECURITY',
        'TEST_COMPLETED',
        'PR_REVIEW_COMPLETED',
        'JOB_FAILED',
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: null },
    severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'INFO'], default: 'INFO' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NotificationModel = model<INotification>('Notification', NotificationSchema);
