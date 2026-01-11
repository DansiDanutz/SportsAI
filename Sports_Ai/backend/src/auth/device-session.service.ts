import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface DeviceInfo {
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  ipAddress?: string;
}

export interface SessionResponse {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

// Session expiry - 7 days (matches refresh token expiry)
const SESSION_EXPIRY_DAYS = 7;

@Injectable()
export class DeviceSessionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Parse User-Agent string to extract device info
   */
  parseUserAgent(userAgent: string): Partial<DeviceInfo> {
    const result: Partial<DeviceInfo> = {
      deviceType: 'desktop',
    };

    // Detect browser
    if (userAgent.includes('Firefox')) {
      result.browser = 'Firefox';
    } else if (userAgent.includes('Edg/')) {
      result.browser = 'Edge';
    } else if (userAgent.includes('Chrome')) {
      result.browser = 'Chrome';
    } else if (userAgent.includes('Safari')) {
      result.browser = 'Safari';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      result.browser = 'Opera';
    } else {
      result.browser = 'Unknown Browser';
    }

    // Detect OS
    if (userAgent.includes('Windows')) {
      result.os = 'Windows';
    } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
      result.os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      result.os = 'Linux';
    } else if (userAgent.includes('Android')) {
      result.os = 'Android';
      result.deviceType = 'mobile';
    } else if (userAgent.includes('iPhone')) {
      result.os = 'iOS';
      result.deviceType = 'mobile';
    } else if (userAgent.includes('iPad')) {
      result.os = 'iPadOS';
      result.deviceType = 'tablet';
    } else {
      result.os = 'Unknown OS';
    }

    // Construct device name
    result.deviceName = `${result.browser} on ${result.os}`;

    return result;
  }

  /**
   * Hash a refresh token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create a new device session
   */
  async createSession(
    userId: string,
    refreshToken: string,
    userAgent: string,
    ipAddress?: string,
  ): Promise<void> {
    const deviceInfo = this.parseUserAgent(userAgent);
    const hashedToken = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.deviceSession.create({
      data: {
        userId,
        refreshToken: hashedToken,
        deviceName: deviceInfo.deviceName || 'Unknown Device',
        deviceType: deviceInfo.deviceType || 'desktop',
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ipAddress,
        expiresAt,
      },
    });
  }

  /**
   * Update session activity timestamp
   */
  async updateSessionActivity(refreshToken: string): Promise<void> {
    const hashedToken = this.hashToken(refreshToken);

    await this.prisma.deviceSession.updateMany({
      where: {
        refreshToken: hashedToken,
        isRevoked: false,
      },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string, currentRefreshToken?: string): Promise<SessionResponse[]> {
    const currentTokenHash = currentRefreshToken ? this.hashToken(currentRefreshToken) : null;

    const sessions = await this.prisma.deviceSession.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
      isCurrent: currentTokenHash ? session.refreshToken === currentTokenHash : false,
    }));
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.deviceSession.updateMany({
      where: {
        id: sessionId,
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return result.count > 0;
  }

  /**
   * Revoke all sessions for a user except the current one
   */
  async revokeOtherSessions(userId: string, currentRefreshToken: string): Promise<number> {
    const currentTokenHash = this.hashToken(currentRefreshToken);

    const result = await this.prisma.deviceSession.updateMany({
      where: {
        userId,
        isRevoked: false,
        refreshToken: { not: currentTokenHash },
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Revoke all sessions for a user (used on password change)
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const result = await this.prisma.deviceSession.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Check if a session is valid (not revoked)
   */
  async isSessionValid(refreshToken: string): Promise<boolean> {
    const hashedToken = this.hashToken(refreshToken);

    const session = await this.prisma.deviceSession.findUnique({
      where: { refreshToken: hashedToken },
    });

    if (!session) {
      // Session doesn't exist - could be from before session tracking was implemented
      // Allow it for backwards compatibility
      return true;
    }

    return !session.isRevoked && session.expiresAt > new Date();
  }

  /**
   * Revoke session by refresh token
   */
  async revokeSessionByToken(refreshToken: string): Promise<void> {
    const hashedToken = this.hashToken(refreshToken);

    await this.prisma.deviceSession.updateMany({
      where: { refreshToken: hashedToken },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Clean up expired sessions (can be run as a scheduled task)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.deviceSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    return result.count;
  }
}
