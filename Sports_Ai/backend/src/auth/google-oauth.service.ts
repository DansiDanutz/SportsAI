import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceSessionService } from './device-session.service';
import { AuthResponse } from './auth.service';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface GoogleIdTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash?: string;
  nonce?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  iat: number;
  exp: number;
}

interface OAuthState {
  state: string;
  nonce: string;
  createdAt: Date;
  redirectUri: string;
}

// Token expiry configuration (same as auth.service.ts)
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 900;

// OAuth state expiry (10 minutes)
const OAUTH_STATE_EXPIRY_MS = 10 * 60 * 1000;

@Injectable()
export class GoogleOAuthService {
  // In-memory store for OAuth states (in production, use Redis)
  private oauthStates = new Map<string, OAuthState>();

  // Allowed redirect URIs (must match exactly)
  private allowedRedirectUris: string[];

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private deviceSessionService: DeviceSessionService,
  ) {
    // Initialize allowed redirect URIs from environment
    const baseCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/v1/auth/google/callback';
    this.allowedRedirectUris = [
      baseCallbackUrl,
      'http://localhost:3000/v1/auth/google/callback',
      'http://localhost:4000/v1/auth/google/callback',
    ];
  }

  /**
   * Generate OAuth authorization URL with state and nonce for CSRF and replay protection
   */
  generateAuthUrl(frontendRedirectUri?: string): { authUrl: string; state: string } {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID.');
    }

    // Generate cryptographically secure state and nonce
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    // Use configured callback URL
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/v1/auth/google/callback';

    // Store state for validation (expires in 10 minutes)
    this.oauthStates.set(state, {
      state,
      nonce,
      createdAt: new Date(),
      redirectUri,
    });

    // Clean up expired states
    this.cleanupExpiredStates();

    // Build authorization URL with all required parameters
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      nonce: nonce,
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return { authUrl, state };
  }

  /**
   * Handle OAuth callback - validates state, exchanges code for tokens, validates ID token
   */
  async handleCallback(
    code: string,
    state: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    // Step 1: Validate state parameter (CSRF protection)
    const storedState = this.oauthStates.get(state);
    if (!storedState) {
      throw new UnauthorizedException('Invalid or expired OAuth state. Please try again.');
    }

    // Check state expiry
    const stateAge = Date.now() - storedState.createdAt.getTime();
    if (stateAge > OAUTH_STATE_EXPIRY_MS) {
      this.oauthStates.delete(state);
      throw new UnauthorizedException('OAuth state expired. Please try again.');
    }

    // Remove used state (prevent replay attacks)
    this.oauthStates.delete(state);

    // Step 2: Validate redirect URI strictly matches
    const redirectUri = storedState.redirectUri;
    if (!this.allowedRedirectUris.includes(redirectUri)) {
      throw new UnauthorizedException('Invalid redirect URI');
    }

    // Step 3: Exchange authorization code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(code, redirectUri);

    // Step 4: Validate and decode ID token
    const idTokenPayload = await this.validateIdToken(tokenResponse.id_token, storedState.nonce);

    // Step 5: Validate token claims
    this.validateTokenClaims(idTokenPayload);

    // Step 6: Find or create user
    const user = await this.findOrCreateOAuthUser(idTokenPayload);

    // Step 7: Generate application tokens
    return this.generateAuthResponse(user, ipAddress, userAgent);
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth is not properly configured');
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OAuth] Token exchange failed:', errorData);
        throw new UnauthorizedException('Failed to exchange authorization code');
      }

      const data = await response.json() as Record<string, unknown>;

      // Validate required fields in token response
      if (!data.access_token || !data.id_token) {
        throw new UnauthorizedException('Invalid token response from Google');
      }

      return {
        access_token: data.access_token as string,
        expires_in: data.expires_in as number,
        id_token: data.id_token as string,
        refresh_token: data.refresh_token as string | undefined,
        scope: data.scope as string,
        token_type: data.token_type as string,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[OAuth] Token exchange error:', error);
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }

  /**
   * Validate ID token (JWT) and verify nonce
   */
  private async validateIdToken(idToken: string, expectedNonce: string): Promise<GoogleIdTokenPayload> {
    try {
      // Decode the ID token (in production, you should verify the signature using Google's public keys)
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid ID token format');
      }

      // Decode payload
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson) as GoogleIdTokenPayload;

      // Verify issuer
      if (!['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss)) {
        throw new UnauthorizedException('Invalid token issuer');
      }

      // Verify audience (client ID)
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (payload.aud !== clientId) {
        throw new UnauthorizedException('Invalid token audience');
      }

      // Verify expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new UnauthorizedException('ID token has expired');
      }

      // Verify nonce (replay protection for OIDC)
      if (payload.nonce !== expectedNonce) {
        throw new UnauthorizedException('Invalid nonce - possible replay attack detected');
      }

      // Verify email is present and verified
      if (!payload.email) {
        throw new UnauthorizedException('Email not provided by Google');
      }

      if (!payload.email_verified) {
        throw new UnauthorizedException('Email not verified with Google');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[OAuth] ID token validation error:', error);
      throw new UnauthorizedException('Failed to validate ID token');
    }
  }

  /**
   * Additional token claim validations
   */
  private validateTokenClaims(payload: GoogleIdTokenPayload): void {
    // Verify issued at time is not in the future (with 5 minute tolerance for clock skew)
    const now = Math.floor(Date.now() / 1000);
    const clockSkewTolerance = 300; // 5 minutes

    if (payload.iat > now + clockSkewTolerance) {
      throw new UnauthorizedException('Token issued in the future - possible clock skew attack');
    }

    // Verify token is not too old (issued more than 10 minutes ago)
    const maxTokenAge = 600; // 10 minutes
    if (now - payload.iat > maxTokenAge) {
      throw new UnauthorizedException('Token is too old. Please try logging in again.');
    }

    // Verify authorized party (azp) matches client ID if present
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (payload.azp && payload.azp !== clientId) {
      throw new UnauthorizedException('Invalid authorized party');
    }
  }

  /**
   * Find existing user or create new OAuth user
   */
  private async findOrCreateOAuthUser(profile: GoogleIdTokenPayload) {
    // Check if user exists by email
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      // Create new user for OAuth login
      // Generate a random password hash since OAuth users don't use password login
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          passwordHash,
          subscriptionTier: 'free',
          creditBalance: 0,
          googleId: profile.sub,
          profilePictureUrl: profile.picture || null,
        },
      });

      console.log(`[OAuth] Created new user via Google OAuth: ${profile.email}`);
    } else if (!user.googleId) {
      // Link existing account with Google
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.sub,
          profilePictureUrl: user.profilePictureUrl || profile.picture || null,
        },
      });

      console.log(`[OAuth] Linked existing user to Google account: ${profile.email}`);
    }

    return user;
  }

  /**
   * Generate auth response with JWT tokens
   */
  private async generateAuthResponse(
    user: { id: string; email: string; subscriptionTier: string; role: string; creditBalance: number; twoFactorEnabled: boolean | null },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'access' },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_EXPIRY },
    );

    // Create device session
    if (userAgent) {
      await this.deviceSessionService.createSession(user.id, refreshToken, userAgent, ipAddress);
    }

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
        twoFactorEnabled: user.twoFactorEnabled || false,
      },
    };
  }

  /**
   * Clean up expired OAuth states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.oauthStates.entries()) {
      if (now - data.createdAt.getTime() > OAUTH_STATE_EXPIRY_MS) {
        this.oauthStates.delete(state);
      }
    }
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured(): boolean {
    return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
}
