import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { generateSecret, generate, verify, generateURI } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  backupCodes?: string[];
}

@Injectable()
export class TwoFactorService {
  private readonly APP_NAME = 'SportsAI';

  constructor(private prisma: PrismaService) {}

  /**
   * Generate a new 2FA secret and QR code for setup
   */
  async generateSecret(userId: string): Promise<TwoFactorSetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    // Generate a new secret
    const secret = generateSecret();

    // Generate the otpauth URL for QR code
    const otpauthUrl = generateURI({
      issuer: this.APP_NAME,
      label: user.email,
      secret,
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store the secret temporarily (not enabled yet until verified)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        // Don't enable yet - wait for verification
      },
    });

    return {
      secret,
      qrCodeDataUrl,
      backupCodes,
    };
  }

  /**
   * Verify the TOTP code and enable 2FA
   */
  async verifyAndEnable(userId: string, token: string): Promise<TwoFactorVerifyResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Please generate a 2FA secret first');
    }

    // Verify the token
    const isValid = await verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate and hash backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        backupCodes: JSON.stringify(hashedBackupCodes),
      },
    });

    return {
      success: true,
      backupCodes,
    };
  }

  /**
   * Verify a TOTP code for login
   */
  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true, backupCodes: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // First try TOTP verification
    const isValidTotp = await verify({
      token,
      secret: user.twoFactorSecret,
    });

    if (isValidTotp) {
      return true;
    }

    // Try backup code verification
    if (user.backupCodes) {
      const hashedBackupCodes: string[] = JSON.parse(user.backupCodes);
      const tokenHash = this.hashBackupCode(token);
      const backupCodeIndex = hashedBackupCodes.findIndex(code => code === tokenHash);

      if (backupCodeIndex !== -1) {
        // Remove used backup code
        hashedBackupCodes.splice(backupCodeIndex, 1);
        await this.prisma.user.update({
          where: { id: userId },
          data: { backupCodes: JSON.stringify(hashedBackupCodes) },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Disable 2FA for a user
   */
  async disable(userId: string, token: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify the token before disabling
    const isValid = await this.verifyToken(userId, token);

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      },
    });

    return { success: true };
  }

  /**
   * Check if a user has 2FA enabled
   */
  async isEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled ?? false;
  }

  /**
   * Get the 2FA status for a user
   */
  async getStatus(userId: string): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, backupCodes: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    let backupCodesRemaining = 0;
    if (user.backupCodes) {
      const codes: string[] = JSON.parse(user.backupCodes);
      backupCodesRemaining = codes.length;
    }

    return {
      enabled: user.twoFactorEnabled,
      backupCodesRemaining,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, token: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify the token first
    const isValid = await this.verifyToken(userId, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map(code => this.hashBackupCode(code));

    await this.prisma.user.update({
      where: { id: userId },
      data: { backupCodes: JSON.stringify(hashedBackupCodes) },
    });

    return { backupCodes };
  }

  /**
   * Generate 10 random backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash a backup code for secure storage
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
  }
}
