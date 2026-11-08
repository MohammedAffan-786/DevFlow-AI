import { Schema, model, Document, Types } from 'mongoose';

export type OrganizationRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'MEMBER' | 'VIEWER';

export interface IUserMembership extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  role: OrganizationRole;
  repositoryAccess: 'ALL' | 'SELECTED';
  allowedRepositories: Types.ObjectId[];
  joinedAt: Date;
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserMembershipSchema = new Schema<IUserMembership>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'DEVELOPER', 'MEMBER', 'VIEWER'],
      default: 'DEVELOPER',
      required: true,
    },
    repositoryAccess: {
      type: String,
      enum: ['ALL', 'SELECTED'],
      default: 'ALL',
      required: true,
    },
    allowedRepositories: [{ type: Schema.Types.ObjectId, ref: 'Repository' }],
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

UserMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export const UserMembershipModel = model<IUserMembership>('UserMembership', UserMembershipSchema);
