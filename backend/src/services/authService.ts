import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { UserModel, IUser } from '../models/User';
import { UserMembershipModel } from '../models/UserMembership';
import { OrganizationModel } from '../models/Organization';
import { UserDTO } from '@devflow/shared';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'devflow_super_secret_access_jwt_key_256bit!';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'devflow_super_secret_refresh_jwt_key_256bit!';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  // Password Hashing via crypto.scrypt (Native, high security, zero C++ compilation dependencies)
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  static verifyPassword(password: string, combinedHash: string): boolean {
    const parts = combinedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  // Cryptographic Tokens for Reset and Verification
  static generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // JWT Generation
  static generateAccessToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: '15m' });
  }

  static generateRefreshToken(user: IUser): string {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  // Set Secure HTTP-only Cookies
  static setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  static clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
  }

  // Format User DTO with organization membership details
  static async formatUserDTO(user: IUser): Promise<UserDTO> {
    const membership = await UserMembershipModel.findOne({ userId: user._id }).populate('organizationId');
    let orgInfo = undefined;
    if (membership && membership.organizationId) {
      const org = membership.organizationId as any;
      orgInfo = {
        id: org._id.toString(),
        name: org.name,
        slug: org.slug,
        role: membership.role === 'DEVELOPER' ? 'MEMBER' : membership.role,
      };
    }

    return {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      githubConnected: !!user.githubId,
      organization: orgInfo,
    };
  }

  static async register(input: {
    email: string;
    password: string;
    name?: string;
    organizationName?: string;
  }): Promise<{ user: UserDTO; accessToken: string; refreshToken: string }> {
    const email = input.email.trim().toLowerCase();
    if (await UserModel.exists({ email })) {
      throw Object.assign(new Error('An account with this email already exists'), { status: 409 });
    }

    const usernameBase =
      email
        .split('@')[0]
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '') || 'user';
    let username = usernameBase;
    let suffix = 1;
    while (await UserModel.exists({ username })) {
      username = `${usernameBase}${suffix}`;
      suffix += 1;
    }

    const displayName = input.name?.trim() || username;
    const user = await UserModel.create({
      email,
      username,
      displayName,
      passwordHash: this.hashPassword(input.password),
      role: 'USER',
    });

    const organizationName = input.organizationName?.trim() || `${displayName}'s Organization`;
    const slugBase =
      organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'organization';
    let slug = slugBase;
    suffix = 1;
    while (await OrganizationModel.exists({ slug })) {
      slug = `${slugBase}-${suffix}`;
      suffix += 1;
    }

    const organization = await OrganizationModel.create({
      name: organizationName,
      slug,
      billingEmail: email,
    });
    await UserMembershipModel.create({
      userId: user._id,
      organizationId: organization._id,
      role: 'OWNER',
    });

    return {
      user: await this.formatUserDTO(user),
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  static async login(
    email: string,
    password: string
  ): Promise<{ user: UserDTO; accessToken: string; refreshToken: string }> {
    const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      throw Object.assign(new Error('Invalid email or password'), { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();
    return {
      user: await this.formatUserDTO(user),
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
    };
  }

  static async getProfile(userId: string): Promise<UserDTO> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }
    return this.formatUserDTO(user);
  }
}
