import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  /**
   * Deep merge plain objects. Arrays are replaced (not merged).
   */
  private deepMerge<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(patch || {})) {
      const current = out[key];
      if (Array.isArray(value)) {
        out[key] = value;
        continue;
      }
      if (this.isPlainObject(value) && this.isPlainObject(current)) {
        out[key] = this.deepMerge(current, value);
        continue;
      }
      out[key] = value;
    }
    return out as T;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(email: string, passwordHash: string) {
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        subscriptionTier: 'free',
        creditBalance: 0,
      },
    });
  }

  async updateSubscription(userId: string, tier: 'free' | 'premium') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: tier },
    });
  }

  async updateCredits(userId: string, amount: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: amount } },
    });
  }

  async updateProfilePicture(userId: string, profilePictureUrl: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { profilePictureUrl },
    });
  }

  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get user email for transaction audit trail
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found.',
        };
      }

      // Anonymize email for GDPR compliance while preserving audit trail
      // Keep domain for statistical purposes
      const emailParts = user.email.split('@');
      const anonymizedEmail = `deleted_${userId.slice(0, 8)}@${emailParts[1] || 'deleted.local'}`;

      // Update transactions to preserve audit trail with anonymized user info
      // The onDelete: SetNull will set userId to null, but we also store anonymized email
      await this.prisma.creditTransaction.updateMany({
        where: { userId },
        data: { deletedUserEmail: anonymizedEmail },
      });

      // Delete user - cascade will handle favorites, presets, password reset tokens
      // Credit transactions will have userId set to null but are preserved
      await this.prisma.user.delete({
        where: { id: userId },
      });

      return {
        success: true,
        message: 'Account deleted successfully. Transaction history preserved for audit.',
      };
    } catch (error) {
      console.error('[Users] Failed to delete user:', error);
      return {
        success: false,
        message: 'Failed to delete account. Please try again.',
      };
    }
  }

  // Track pending export requests to prevent duplicates
  private pendingExports = new Map<string, { requestedAt: Date; jobId: string }>();

  // Track subscription cancellations (in production, this would be in the database)
  private cancellations = new Map<string, {
    cancelledAt: Date;
    reason: string;
    accessEndsAt: Date;
    previousTier: string;
  }>();

  async cancelSubscription(userId: string, reason: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate end of billing period (assume 30 days from now for demo)
    const accessEndsAt = new Date();
    accessEndsAt.setDate(accessEndsAt.getDate() + 30);

    const cancellation = {
      cancelledAt: new Date(),
      reason,
      accessEndsAt,
      previousTier: user.subscriptionTier,
    };

    this.cancellations.set(userId, cancellation);

    return cancellation;
  }

  getCancellationStatus(userId: string) {
    return this.cancellations.get(userId) || null;
  }

  async requestDataExport(userId: string): Promise<{ success: boolean; message: string; jobId?: string; isPending?: boolean }> {
    // Check if there's already a pending export for this user
    const existingExport = this.pendingExports.get(userId);
    if (existingExport) {
      const timeSinceRequest = Date.now() - existingExport.requestedAt.getTime();
      // Consider exports pending for up to 5 minutes
      if (timeSinceRequest < 5 * 60 * 1000) {
        return {
          success: true,
          message: 'Data export already in progress. Please wait for the current export to complete.',
          jobId: existingExport.jobId,
          isPending: true,
        };
      }
      // Clear stale export
      this.pendingExports.delete(userId);
    }

    // Create new export job
    const jobId = `export_${userId}_${Date.now()}`;
    this.pendingExports.set(userId, { requestedAt: new Date(), jobId });

    // Get user data for export
    const user = await this.findById(userId);
    if (!user) {
      this.pendingExports.delete(userId);
      return { success: false, message: 'User not found' };
    }

    // Simulate async export processing - in production this would be queued
    setTimeout(() => {
      this.pendingExports.delete(userId);
      console.log(`[Export] Completed export for user ${userId}, job ${jobId}`);
    }, 10000); // 10 seconds to simulate export processing

    return {
      success: true,
      message: 'Data export requested. You will receive an email when your data is ready.',
      jobId,
      isPending: false,
    };
  }

  async getExportStatus(userId: string): Promise<{ isPending: boolean; jobId?: string; requestedAt?: Date }> {
    const existingExport = this.pendingExports.get(userId);
    if (existingExport) {
      return {
        isPending: true,
        jobId: existingExport.jobId,
        requestedAt: existingExport.requestedAt,
      };
    }
    return { isPending: false };
  }

  // Sport-specific settings (stored in-memory for now, would be in database in production)
  private sportSettings = new Map<string, Record<string, unknown>>();

  async getSportSettings(userId: string, sportKey: string): Promise<Record<string, unknown> | null> {
    const key = `${userId}:${sportKey}`;
    return this.sportSettings.get(key) || null;
  }

  async updateSportSettings(
    userId: string,
    sportKey: string,
    settings: {
      enabledMarkets: string[];
      preferredPeriod: string;
      showLiveOnly: boolean;
      minOdds: number;
      maxOdds: number;
      defaultStake: number;
    },
  ): Promise<Record<string, unknown>> {
    const key = `${userId}:${sportKey}`;
    const updatedSettings = {
      sportId: sportKey,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    this.sportSettings.set(key, updatedSettings);
    return updatedSettings;
  }

  // Preferences management
  async getPreferences(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!user?.preferences) {
      return this.getDefaultPreferences();
    }

    try {
      const parsed = JSON.parse(user.preferences);
      // Deep-merge with defaults to ensure nested keys exist (e.g., display.*)
      return this.deepMerge(this.getDefaultPreferences(), parsed);
    } catch {
      return this.getDefaultPreferences();
    }
  }

  async updatePreferences(userId: string, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Get current preferences and merge with updates
    const currentPrefs = await this.getPreferences(userId);
    const newPrefs = this.deepMerge(currentPrefs, updates);

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: JSON.stringify(newPrefs) },
    });

    return newPrefs;
  }

  private getDefaultPreferences(): Record<string, unknown> {
    return {
      hasCompletedOnboarding: false,
      notifications: {
        email: true,
        push: false,
        arbitrageAlerts: true,
      },
      display: {
        theme: 'dark',
        oddsFormat: 'decimal',
        timezone: 'UTC',
      },
      sportsbook: {
        defaultStake: 100,
        currency: 'USD',
      },
      favoriteSports: [],
      favoriteBookmakers: [],
    };
  }
}
