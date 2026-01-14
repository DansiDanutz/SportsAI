import { Injectable, UnauthorizedException, ConflictException, BadRequestException, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimiterService } from './rate-limiter.service';
import { DeviceSessionService } from './device-session.service';

export interface JwtPayload {
  sub: string;
  email: string;
  type?: 'access' | 'refresh';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    subscriptionTier: string;
    role: string;
    creditBalance: number;
    twoFactorEnabled?: boolean;
    hasCompletedOnboarding?: boolean;
  };
}

// Cookie/session-based auth response (no tokens)
export interface AuthSessionResponse {
  expiresIn: number;
  user: AuthResponse['user'];
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  userId: string;
  message: string;
}

// Token expiry configuration
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes for access token
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days for refresh token
const ACCESS_TOKEN_EXPIRY_SECONDS = 900; // 15 minutes in seconds
const PASSWORD_RESET_EXPIRY_HOURS = 1; // Password reset token expires in 1 hour

import { LanguageService } from '../ai/language.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private rateLimiter: RateLimiterService,
    private deviceSessionService: DeviceSessionService,
    @Inject(forwardRef(() => LanguageService))
    private languageService: LanguageService,
  ) {}

  private generateTokens(userId: string, email: string) {
    const accessPayload: JwtPayload = { sub: userId, email, type: 'access' };
    const refreshPayload: JwtPayload = { sub: userId, email, type: 'refresh' };

    const accessToken = this.jwtService.sign(accessPayload, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: REFRESH_TOKEN_EXPIRY });

    return { accessToken, refreshToken };
  }

  async signup(email: string, password: string, clientIp?: string): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await this.usersService.create(email, passwordHash);

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email);

    // Auto-detect language if not set
    try {
      const detected = await this.languageService.getLanguageFromIP(clientIp || '');
      await this.usersService.updatePreferences(user.id, {
        display: { language: detected.code }
      });
    } catch (e) {
      // Ignore errors in auto-detection
    }

    const prefs = await this.usersService.getPreferences(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        role: user.role,
        creditBalance: user.creditBalance,
        hasCompletedOnboarding: prefs.hasCompletedOnboarding === true,
      },
    };
  }

  async login(email: string, password: string, clientIp?: string, userAgent?: string): Promise<AuthResponse | TwoFactorRequiredResponse> {
    // Use email as the rate limit key (could also use IP)
    const rateLimitKey = email.toLowerCase();

    // Check if rate limited
    const limitCheck = this.rateLimiter.checkLimit(rateLimitKey);
    if (limitCheck.limited) {
      throw new HttpException(
        {
          message: `Too many failed login attempts. Please try again in ${limitCheck.retryAfter} seconds.`,
          error: 'Too Many Requests',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          retryAfter: limitCheck.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Record failed attempt
      this.rateLimiter.recordFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Record failed attempt
      const result = this.rateLimiter.recordFailedAttempt(rateLimitKey);
      if (result.locked) {
        throw new HttpException(
          {
            message: 'Account temporarily locked due to too many failed login attempts. Please try again later.',
            error: 'Too Many Requests',
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful password verification - clear rate limit
    this.rateLimiter.clearLimit(rateLimitKey);

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Two-factor authentication required',
      };
    }

    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email);

    // Create device session
    if (userAgent) {
      await this.deviceSessionService.createSession(user.id, refreshToken, userAgent, clientIp);
    }

    // Auto-detect language if not set
    try {
      const currentPrefs = await this.usersService.getPreferences(user.id);
      if (!(currentPrefs as any).display?.language) {
        const detected = await this.languageService.getLanguageFromIP(clientIp || '');
        await this.usersService.updatePreferences(user.id, {
          display: { ...((currentPrefs as any).display || {}), language: detected.code }
        });
      }
    } catch (e) {
      // Ignore
    }

    const prefs = await this.usersService.getPreferences(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        role: user.role,
        creditBalance: user.creditBalance,
        twoFactorEnabled: user.twoFactorEnabled,
        hasCompletedOnboarding: (prefs as any).hasCompletedOnboarding === true,
      },
    };
  }

  async completeTwoFactorLogin(userId: string, clientIp?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { accessToken, refreshToken } = this.generateTokens(user.id, user.email);

    // Create device session
    if (userAgent) {
      await this.deviceSessionService.createSession(user.id, refreshToken, userAgent, clientIp);
    }

    // Auto-detect language if not set
    try {
      const currentPrefs = await this.usersService.getPreferences(user.id);
      if (!(currentPrefs as any).display?.language) {
        const detected = await this.languageService.getLanguageFromIP(clientIp || '');
        await this.usersService.updatePreferences(user.id, {
          display: { ...((currentPrefs as any).display || {}), language: detected.code }
        });
      }
    } catch (e) {
      // Ignore
    }

    const prefs = await this.usersService.getPreferences(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        role: user.role,
        creditBalance: user.creditBalance,
        twoFactorEnabled: user.twoFactorEnabled,
        hasCompletedOnboarding: (prefs as any).hasCompletedOnboarding === true,
      },
    };
  }

  async refreshTokens(refreshTokenStr: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      const payload = this.jwtService.verify(refreshTokenStr) as JwtPayload;

      // Verify this is a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if session is still valid (not revoked)
      const isSessionValid = await this.deviceSessionService.isSessionValid(refreshTokenStr);
      if (!isSessionValid) {
        throw new UnauthorizedException('Session has been revoked. Please login again.');
      }

      // Verify user still exists
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Update session activity
      await this.deviceSessionService.updateSessionActivity(refreshTokenStr);

      // Generate new tokens
      const { accessToken, refreshToken } = this.generateTokens(user.id, user.email);

      return {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Token expired or invalid
      throw new UnauthorizedException('Refresh token expired or invalid. Please login again.');
    }
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      role: user.role,
      creditBalance: user.creditBalance,
      createdAt: user.createdAt,
    };
  }

  async requestPasswordReset(email: string): Promise<{ message: string; token?: string }> {
    // Always return the same message to prevent email enumeration attacks
    const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return { message: genericMessage };
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000);

    // Invalidate any existing tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new reset token
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // In production, send email here with reset link
    // For testing purposes, we return the token
    return {
      message: genericMessage,
      token, // Only for testing - remove in production
    };
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return { valid: false };
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return { valid: false };
    }

    // Check if token was already used
    if (resetToken.usedAt) {
      return { valid: false };
    }

    return { valid: true, email: resetToken.user.email };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Check if token was already used
    if (resetToken.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Validate password strength (matches client-side validation)
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one special character');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true, message: 'Password has been reset successfully' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Get the user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password strength (matches client-side validation)
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      throw new BadRequestException('Password must contain at least one special character');
    }

    // Check that new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true, message: 'Password changed successfully' };
  }
}
