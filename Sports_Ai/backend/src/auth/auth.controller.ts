import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus, Inject, UnauthorizedException, Param, Headers, Ip, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService, AuthResponse, TwoFactorRequiredResponse } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { TwoFactorService } from './two-factor.service';
import { DeviceSessionService, SessionResponse } from './device-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsEmail, IsString, MinLength, Matches, ValidatorConstraint, ValidatorConstraintInterface, Validate } from 'class-validator';

// Custom password validator that matches client-side validation exactly
// Requirements: 8+ chars, uppercase, lowercase, number, special character
@ValidatorConstraint({ name: 'strongPassword', async: false })
class StrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password || password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    return true;
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (!@#$%^&*(),.?":{}|<>)';
  }
}

class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Validate(StrongPasswordConstraint)
  password!: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @Validate(StrongPasswordConstraint)
  newPassword!: string;
}

class ValidateResetTokenDto {
  @IsString()
  token!: string;
}

class TwoFactorVerifyDto {
  @IsString()
  token!: string;
}

class TwoFactorDisableDto {
  @IsString()
  token!: string;
}

class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @Validate(StrongPasswordConstraint)
  newPassword!: string;
}

@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(GoogleOAuthService) private readonly googleOAuthService: GoogleOAuthService,
    @Inject(TwoFactorService) private readonly twoFactorService: TwoFactorService,
    @Inject(DeviceSessionService) private readonly deviceSessionService: DeviceSessionService,
  ) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto, @Ip() ip: string): Promise<AuthResponse> {
    return this.authService.signup(dto.email, dto.password, ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponse | TwoFactorRequiredResponse> {
    return this.authService.login(dto.email, dto.password, ip, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout() {
    // In a production app, you'd invalidate the token here
    // For now, the client just discards the token
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  async validateResetToken(@Body() dto: ValidateResetTokenDto) {
    return this.authService.validateResetToken(dto.token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // Two-Factor Authentication Endpoints

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  async getTwoFactorStatus(@Request() req: any) {
    return this.twoFactorService.getStatus(req.user.id);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(@Request() req: any) {
    return this.twoFactorService.generateSecret(req.user.id);
  }

  @Post('2fa/verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(@Request() req: any, @Body() dto: TwoFactorVerifyDto) {
    return this.twoFactorService.verifyAndEnable(req.user.id, dto.token);
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(@Request() req: any, @Body() dto: TwoFactorDisableDto) {
    return this.twoFactorService.disable(req.user.id, dto.token);
  }

  @Post('2fa/regenerate-backup-codes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(@Request() req: any, @Body() dto: TwoFactorVerifyDto) {
    return this.twoFactorService.regenerateBackupCodes(req.user.id, dto.token);
  }

  @Post('2fa/validate')
  @HttpCode(HttpStatus.OK)
  async validateTwoFactorForLogin(@Body() body: { userId: string; token: string }) {
    const isValid = await this.twoFactorService.verifyToken(body.userId, body.token);
    return { valid: isValid };
  }

  @Post('2fa/complete-login')
  @HttpCode(HttpStatus.OK)
  async completeTwoFactorLogin(
    @Body() body: { userId: string; token: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // Verify the 2FA token first
    const isValid = await this.twoFactorService.verifyToken(body.userId, body.token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Complete the login
    return this.authService.completeTwoFactorLogin(body.userId, ip, userAgent);
  }

  // Device Session Management Endpoints

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(
    @Request() req: any,
    @Headers('authorization') authHeader: string,
  ): Promise<SessionResponse[]> {
    // Extract refresh token from stored session (in a real app, this would be in a cookie or stored separately)
    // For now, we'll return sessions without marking the current one
    return this.deviceSessionService.getUserSessions(req.user.id);
  }

  @Post('sessions/:sessionId/revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    const revoked = await this.deviceSessionService.revokeSession(sessionId, req.user.id);
    if (!revoked) {
      return { success: false, message: 'Session not found or already revoked' };
    }
    return { success: true, message: 'Session revoked successfully' };
  }

  @Post('sessions/revoke-others')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeOtherSessions(
    @Request() req: any,
    @Body() body: { refreshToken: string },
  ): Promise<{ success: boolean; revokedCount: number }> {
    const revokedCount = await this.deviceSessionService.revokeOtherSessions(
      req.user.id,
      body.refreshToken,
    );
    return { success: true, revokedCount };
  }

  @Post('sessions/revoke-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@Request() req: any): Promise<{ success: boolean; revokedCount: number }> {
    const revokedCount = await this.deviceSessionService.revokeAllSessions(req.user.id);
    return { success: true, revokedCount };
  }

  // Google OAuth Endpoints

  /**
   * Check if Google OAuth is configured
   */
  @Get('google/status')
  getGoogleOAuthStatus(): { configured: boolean } {
    return { configured: this.googleOAuthService.isConfigured() };
  }

  /**
   * Get Google OAuth authorization URL
   * Returns the URL to redirect the user to for Google login
   */
  @Get('google/url')
  getGoogleAuthUrl(): { authUrl: string; state: string } {
    return this.googleOAuthService.generateAuthUrl();
  }

  /**
   * Handle Google OAuth callback
   * Validates state, exchanges code for tokens, validates ID token, and creates session
   */
  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res() res: Response,
  ): Promise<void> {
    // Handle OAuth errors from Google
    if (error) {
      console.error('[OAuth] Google returned error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3004'}/login?error=oauth_failed`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3004'}/login?error=missing_params`);
      return;
    }

    try {
      const authResponse = await this.googleOAuthService.handleCallback(code, state, ip, userAgent);

      // Redirect to frontend with tokens (in production, use secure cookies)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3004';
      const params = new URLSearchParams({
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        userId: authResponse.user.id,
        email: authResponse.user.email,
        tier: authResponse.user.subscriptionTier,
      });

      res.redirect(`${frontendUrl}/oauth/callback?${params.toString()}`);
    } catch (err) {
      console.error('[OAuth] Callback error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3004';
      res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMessage)}`);
    }
  }
}
