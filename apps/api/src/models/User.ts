import { Schema, model, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  avatarUrl: string;
  role: 'SYSTEM_ADMIN' | 'USER';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  githubId?: number;
  githubAccessToken?: string;
  githubUsername?: string;
  githubOAuthState?: string;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    role: { type: String, enum: ['SYSTEM_ADMIN', 'USER'], default: 'USER', required: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null, select: false },
    emailVerificationExpires: { type: Date, default: null, select: false },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    githubId: { type: Number, default: null, sparse: true, index: true },
    githubAccessToken: { type: String, default: null, select: false },
    githubUsername: { type: String, default: null },
    githubOAuthState: { type: String, default: null, select: false },
    lastLoginAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any).passwordHash;
        delete (ret as any).githubAccessToken;
        delete (ret as any).emailVerificationToken;
        delete (ret as any).passwordResetToken;
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        delete (ret as any).passwordHash;
        delete (ret as any).githubAccessToken;
        delete (ret as any).emailVerificationToken;
        delete (ret as any).passwordResetToken;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

export const UserModel = model<IUser>('User', UserSchema);
