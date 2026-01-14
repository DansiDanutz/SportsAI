import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus, Inject, UnauthorizedException, Param, Headers, Ip, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthService, AuthResponse, TwoFactorRequiredResponse, AuthSessionResponse } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { TwoFactorService } from './two-factor.service';
import { DeviceSessionService, SessionResponse } from './device-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IsEmail, IsString, IsOptional, IsBoolean, ValidatorConstraint, ValidatorConstraintInterface, Validate } from 'class-validator';

const ACCESS_TOKEN_COOKIE = 'sportsai_access_token';
const REFRESH_TOKEN_COOKIE = 'sportsai_refresh_token';

function isTwoFactorRequiredResponse(
  response: AuthResponse | TwoFactorRequiredResponse,
): response is TwoFactorRequiredResponse {
  return (response as any)?.requiresTwoFactor === true;
}

function isProd(): boolean {
  return (process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function getCookieOptions(overrides?: Partial<Record<string, unknown>>) {
  return {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    ...overrides,
  } as const;
}

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

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
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
  async signup(
    @Body() dto: SignupDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthSessionResponse> {
    const authResponse = await this.authService.signup(dto.email, dto.password, ip);

    // Set HttpOnly auth cookies (do not expose tokens in JS storage)
    res.setCookie(ACCESS_TOKEN_COOKIE, authResponse.accessToken, getCookieOptions({ maxAge: authResponse.expiresIn }));
    // Default signup to a persistent refresh cookie (users expect to stay signed in)
    res.setCookie(REFRESH_TOKEN_COOKIE, authResponse.refreshToken, getCookieOptions({ maxAge: 7 * 24 * 60 * 60 }));

    return { expiresIn: authResponse.expiresIn, user: authResponse.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthSessionResponse | TwoFactorRequiredResponse> {
    const authResponse = await this.authService.login(dto.email, dto.password, ip, userAgent);

    // If 2FA is required, don't set cookies yet
    if (isTwoFactorRequiredResponse(authResponse)) {
      return authResponse;
    }

    const rememberMe = dto.rememberMe === true;
    const refreshCookieOptions = rememberMe
      ? getCookieOptions({ maxAge: 7 * 24 * 60 * 60 })
      : getCookieOptions(); // session cookie

    res.setCookie(ACCESS_TOKEN_COOKIE, authResponse.accessToken, getCookieOptions({ maxAge: authResponse.expiresIn }));
    res.setCookie(REFRESH_TOKEN_COOKIE, authResponse.refreshToken, refreshCookieOptions);

    return { expiresIn: authResponse.expiresIn, user: authResponse.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any, @Res({ passthrough: true }) res: FastifyReply) {
    const refreshToken = req?.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof refreshToken === 'string' && refreshToken.length) {
      // Revoke the session server-side (best-effort)
      await this.deviceSessionService.revokeSessionByToken(refreshToken).catch(() => undefined);
    }

    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Request() req: any,
    @Body() dto: Partial<RefreshTokenDto>,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken =
      (dto && typeof dto.refreshToken === 'string' && dto.refreshToken.length ? dto.refreshToken : null) ||
      (req?.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined);

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    res.setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, getCookieOptions({ maxAge: tokens.expiresIn }));
    // Always rotate refresh token on refresh
    res.setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getCookieOptions({ maxAge: 7 * 24 * 60 * 60 }));
    return { success: true, expiresIn: tokens.expiresIn };
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
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    // Verify the 2FA token first
    const isValid = await this.twoFactorService.verifyToken(body.userId, body.token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Complete the login
    const authResponse = await this.authService.completeTwoFactorLogin(body.userId, ip, userAgent);
    // 2FA completion defaults to session cookie (user can opt into remember-me on next login)
    res.setCookie(ACCESS_TOKEN_COOKIE, authResponse.accessToken, getCookieOptions({ maxAge: authResponse.expiresIn }));
    res.setCookie(REFRESH_TOKEN_COOKIE, authResponse.refreshToken, getCookieOptions());
    return { expiresIn: authResponse.expiresIn, user: authResponse.user };
  }

  // Device Session Management Endpoints

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(
    @Request() req: any,
    @Headers('authorization') authHeader: string,
  ): Promise<SessionResponse[]> {
    const currentRefreshToken = req?.cookies?.[REFRESH_TOKEN_COOKIE];
    return this.deviceSessionService.getUserSessions(req.user.id, currentRefreshToken);
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
    @Body() body: Partial<{ refreshToken: string }>,
  ): Promise<{ success: boolean; revokedCount: number }> {
    const currentRefreshToken =
      (body?.refreshToken && typeof body.refreshToken === 'string' ? body.refreshToken : null) ||
      (req?.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined);

    if (!currentRefreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const revokedCount = await this.deviceSessionService.revokeOtherSessions(
      req.user.id,
      currentRefreshToken,
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
    @Res() res: FastifyReply,
  ): Promise<void> {
    // Handle OAuth errors from Google
    if (error) {
      console.error('[OAuth] Google returned error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=missing_params`);
      return;
    }

    try {
      const authResponse = await this.googleOAuthService.handleCallback(code, state, ip, userAgent);

      // Set secure HttpOnly cookies and redirect without exposing tokens in the URL
      res.setCookie(ACCESS_TOKEN_COOKIE, authResponse.accessToken, getCookieOptions({ maxAge: authResponse.expiresIn }));
      res.setCookie(REFRESH_TOKEN_COOKIE, authResponse.refreshToken, getCookieOptions({ maxAge: 7 * 24 * 60 * 60 }));

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/oauth/callback?status=success`);
    } catch (err) {
      console.error('[OAuth] Callback error:', err);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
}
