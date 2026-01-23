import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

export interface JwtSecret {
  id: string;
  secret: string;
  version: number;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

/**
 * JWT Secret Rotation Service
 * 
 * Manages JWT secret rotation to enhance security:
 * - Rotates secrets every 90 days
 * - Supports multiple active secrets during transition period
 * - Maintains version history for token validation
 * - Automatically cleans up expired secrets
 */
@Injectable()
export class JwtRotationService implements OnModuleInit {
  private readonly logger = new Logger(JwtRotationService.name);
  private readonly ROTATION_INTERVAL_DAYS = 90;
  private readonly TRANSITION_PERIOD_DAYS = 7; // Keep old secret active for 7 days after rotation
  private readonly MAX_SECRET_HISTORY = 3; // Keep max 3 old secrets for validation

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Initialize with default secret if no secrets exist
    await this.ensureDefaultSecret();
    
    // Check if rotation is needed on startup
    await this.checkAndRotateIfNeeded();
  }

  /**
   * Ensure a default secret exists (for initial setup)
   */
  private async ensureDefaultSecret(): Promise<void> {
    const activeSecret = await this.prisma.jwtSecret.findFirst({
      where: { isActive: true },
    });

    if (!activeSecret) {
      this.logger.log('No active JWT secret found. Creating default secret...');
      const defaultSecret = process.env.JWT_SECRET || this.generateSecret();
      
      await this.prisma.jwtSecret.create({
        data: {
          secret: defaultSecret,
          version: 1,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.ROTATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      });

      this.logger.log('Default JWT secret created (version 1)');
    }
  }

  /**
   * Get the current active secret
   */
  async getActiveSecret(): Promise<string> {
    const activeSecret = await this.prisma.jwtSecret.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!activeSecret) {
      // Fallback to environment variable
      const fallbackSecret = process.env.JWT_SECRET || 'sportsai-secret-key-change-in-production';
      this.logger.warn('No active secret in database, using environment variable');
      return fallbackSecret;
    }

    return activeSecret.secret;
  }

  /**
   * Get all active secrets (current + transition period secrets)
   * Used for token validation to support tokens signed with old secrets
   */
  async getActiveSecrets(): Promise<JwtSecret[]> {
    const now = new Date();
    const transitionCutoff = new Date(now.getTime() - this.TRANSITION_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const secrets = await this.prisma.jwtSecret.findMany({
      where: {
        OR: [
          { isActive: true },
          {
            isActive: false,
            createdAt: { gte: transitionCutoff },
          },
        ],
      },
      orderBy: { version: 'desc' },
      take: this.MAX_SECRET_HISTORY,
    });

    // If no secrets in DB, return fallback
    if (secrets.length === 0) {
      const fallbackSecret = process.env.JWT_SECRET || 'sportsai-secret-key-change-in-production';
      return [
        {
          id: 'fallback',
          secret: fallbackSecret,
          version: 0,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          isActive: true,
        },
      ];
    }

    return secrets;
  }

  /**
   * Get secret by version
   */
  async getSecretByVersion(version: number): Promise<string | null> {
    const secret = await this.prisma.jwtSecret.findFirst({
      where: { version },
    });

    return secret?.secret || null;
  }

  /**
   * Rotate JWT secret
   * Creates a new secret and marks old one as inactive after transition period
   */
  async rotateSecret(): Promise<{ newVersion: number; oldVersion: number }> {
    this.logger.log('Starting JWT secret rotation...');

    // Get current active secret
    const currentSecret = await this.prisma.jwtSecret.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!currentSecret) {
      throw new Error('No active secret found to rotate');
    }

    // Generate new secret
    const newSecret = this.generateSecret();
    const newVersion = currentSecret.version + 1;
    const expiresAt = new Date(Date.now() + this.ROTATION_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    // Create new active secret
    await this.prisma.jwtSecret.create({
      data: {
        secret: newSecret,
        version: newVersion,
        createdAt: new Date(),
        expiresAt,
        isActive: true,
      },
    });

    // Mark old secret as inactive (but keep it for transition period)
    await this.prisma.jwtSecret.update({
      where: { id: currentSecret.id },
      data: { isActive: false },
    });

    // Clean up old secrets beyond transition period
    await this.cleanupOldSecrets();

    this.logger.log(`JWT secret rotated: version ${currentSecret.version} -> ${newVersion}`);

    return {
      newVersion,
      oldVersion: currentSecret.version,
    };
  }

  /**
   * Check if rotation is needed and perform it
   */
  async checkAndRotateIfNeeded(): Promise<boolean> {
    const activeSecret = await this.prisma.jwtSecret.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!activeSecret) {
      await this.ensureDefaultSecret();
      return false;
    }

    const now = new Date();
    const daysUntilExpiry = (activeSecret.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Rotate if within 7 days of expiry
    if (daysUntilExpiry <= 7) {
      this.logger.log(`Secret expires in ${daysUntilExpiry.toFixed(1)} days. Rotating...`);
      await this.rotateSecret();
      return true;
    }

    return false;
  }

  /**
   * Scheduled rotation check (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledRotationCheck() {
    this.logger.log('Running scheduled JWT secret rotation check...');
    await this.checkAndRotateIfNeeded();
  }

  /**
   * Clean up old secrets beyond transition period
   */
  private async cleanupOldSecrets(): Promise<void> {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - this.TRANSITION_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    // Get all inactive secrets older than transition period
    const oldSecrets = await this.prisma.jwtSecret.findMany({
      where: {
        isActive: false,
        createdAt: { lt: cutoffDate },
      },
      orderBy: { version: 'asc' },
    });

    // Keep only the most recent MAX_SECRET_HISTORY inactive secrets
    if (oldSecrets.length > this.MAX_SECRET_HISTORY) {
      const toDelete = oldSecrets.slice(0, oldSecrets.length - this.MAX_SECRET_HISTORY);
      
      for (const secret of toDelete) {
        await this.prisma.jwtSecret.delete({
          where: { id: secret.id },
        });
        this.logger.log(`Cleaned up old JWT secret (version ${secret.version})`);
      }
    }
  }

  /**
   * Generate a cryptographically secure random secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Get rotation status for monitoring
   */
  async getRotationStatus(): Promise<{
    currentVersion: number;
    expiresAt: Date;
    daysUntilExpiry: number;
    nextRotationDate: Date;
    activeSecretsCount: number;
  }> {
    const activeSecret = await this.prisma.jwtSecret.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!activeSecret) {
      throw new Error('No active secret found');
    }

    const now = new Date();
    const daysUntilExpiry = (activeSecret.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    const nextRotationDate = new Date(activeSecret.expiresAt.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeSecrets = await this.getActiveSecrets();

    return {
      currentVersion: activeSecret.version,
      expiresAt: activeSecret.expiresAt,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      nextRotationDate,
      activeSecretsCount: activeSecrets.length,
    };
  }
}
