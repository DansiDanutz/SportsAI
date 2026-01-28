import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeviceSessionService } from './device-session.service';
import { AuthResponse } from './auth.service';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserProfile {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

interface OAuthState {
  state: string;
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
export class GitHubOAuthService {
  private oauthStates = new Map<string, OAuthState>();
  private allowedRedirectUris: string[];

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private deviceSessionService: DeviceSessionService,
  ) {
    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    const defaultCallbackUrl = isProd
      ? `${process.env.FRONTEND_URL || 'https://sports-ai-one.vercel.app'}/api/v1/auth/github/callback`
      : 'http://localhost:4000/v1/auth/github/callback';

    const baseCallbackUrl = process.env.GITHUB_CALLBACK_URL || defaultCallbackUrl;
    this.allowedRedirectUris = [
      baseCallbackUrl,
      'http://localhost:3000/v1/auth/github/callback',
      'http://localhost:4000/v1/auth/github/callback',
      'http://localhost:3000/api/v1/auth/github/callback',
      'http://localhost:4000/api/v1/auth/github/callback',
      `${process.env.FRONTEND_URL || 'https://sports-ai-one.vercel.app'}/api/v1/auth/github/callback`,
    ];
  }

  generateAuthUrl(): { authUrl: string; state: string } {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new BadRequestException('GitHub OAuth is not configured. Missing GITHUB_CLIENT_ID.');
    }

    const state = crypto.randomBytes(32).toString('hex');

    const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    const defaultCallbackUrl = isProd
      ? `${process.env.FRONTEND_URL || 'https://sports-ai-one.vercel.app'}/api/v1/auth/github/callback`
      : 'http://localhost:4000/v1/auth/github/callback';

    const redirectUri = process.env.GITHUB_CALLBACK_URL || defaultCallbackUrl;

    this.oauthStates.set(state, {
      state,
      createdAt: new Date(),
      redirectUri,
    });

    this.cleanupExpiredStates();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state: state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return { authUrl, state };
  }

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

    const stateAge = Date.now() - storedState.createdAt.getTime();
    if (stateAge > OAUTH_STATE_EXPIRY_MS) {
      this.oauthStates.delete(state);
      throw new UnauthorizedException('OAuth state expired. Please try again.');
    }

    this.oauthStates.delete(state);

    // Step 2: Validate redirect URI
    const redirectUri = storedState.redirectUri;
    if (!this.allowedRedirectUris.includes(redirectUri)) {
      throw new UnauthorizedException('Invalid redirect URI');
    }

    // Step 3: Exchange code for access token
    const tokenResponse = await this.exchangeCodeForToken(code, redirectUri);

    // Step 4: Fetch GitHub user profile
    const profile = await this.fetchUserProfile(tokenResponse.access_token);

    // Step 5: Get verified email
    const email = await this.getVerifiedEmail(tokenResponse.access_token, profile);

    // Step 6: Find or create user
    const user = await this.findOrCreateOAuthUser(profile, email);

    // Step 7: Generate application tokens
    return this.generateAuthResponse(user, ipAddress, userAgent);
  }

  private async exchangeCodeForToken(code: string, redirectUri: string): Promise<GitHubTokenResponse> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('GitHub OAuth is not properly configured');
    }

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
        }),
      });

      if (!response.ok) {
        console.error('[GitHub OAuth] Token exchange failed:', response.status);
        throw new UnauthorizedException('Failed to exchange authorization code');
      }

      const data = await response.json() as Record<string, unknown>;

      if (data.error) {
        console.error('[GitHub OAuth] Token error:', data.error, data.error_description);
        throw new UnauthorizedException(`GitHub OAuth error: ${data.error_description || data.error}`);
      }

      if (!data.access_token) {
        throw new UnauthorizedException('Invalid token response from GitHub');
      }

      return {
        access_token: data.access_token as string,
        token_type: data.token_type as string,
        scope: data.scope as string,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[GitHub OAuth] Token exchange error:', error);
      throw new UnauthorizedException('Failed to authenticate with GitHub');
    }
  }

  private async fetchUserProfile(accessToken: string): Promise<GitHubUserProfile> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'SportsAI-App',
        },
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch GitHub user profile');
      }

      return await response.json() as GitHubUserProfile;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[GitHub OAuth] Profile fetch error:', error);
      throw new UnauthorizedException('Failed to fetch GitHub profile');
    }
  }

  private async getVerifiedEmail(accessToken: string, profile: GitHubUserProfile): Promise<string> {
    // If profile has a public email, use it
    if (profile.email) {
      return profile.email;
    }

    // Otherwise fetch from /user/emails endpoint
    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'SportsAI-App',
        },
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to fetch GitHub email');
      }

      const emails = await response.json() as GitHubEmail[];

      // Find primary verified email
      const primaryEmail = emails.find(e => e.primary && e.verified);
      if (primaryEmail) {
        return primaryEmail.email;
      }

      // Fallback to any verified email
      const verifiedEmail = emails.find(e => e.verified);
      if (verifiedEmail) {
        return verifiedEmail.email;
      }

      throw new UnauthorizedException('No verified email found on GitHub account. Please verify your email on GitHub and try again.');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[GitHub OAuth] Email fetch error:', error);
      throw new UnauthorizedException('Failed to fetch GitHub email');
    }
  }

  private async findOrCreateOAuthUser(profile: GitHubUserProfile, email: string) {
    const githubIdStr = String(profile.id);

    // Check if user exists by GitHub ID first
    let user = await this.prisma.user.findUnique({ where: { githubId: githubIdStr } });

    if (!user) {
      // Check by email
      user = await this.usersService.findByEmail(email);

      if (!user) {
        // Create new user
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(randomPassword, salt);

        user = await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            subscriptionTier: 'free',
            creditBalance: 0,
            githubId: githubIdStr,
            profilePictureUrl: profile.avatar_url || null,
          },
        });

        console.log(`[GitHub OAuth] Created new user: ${email}`);
      } else {
        // Link existing account with GitHub
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            githubId: githubIdStr,
            profilePictureUrl: user.profilePictureUrl || profile.avatar_url || null,
          },
        });

        console.log(`[GitHub OAuth] Linked existing user to GitHub: ${email}`);
      }
    }

    return user;
  }

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

  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.oauthStates.entries()) {
      if (now - data.createdAt.getTime() > OAUTH_STATE_EXPIRY_MS) {
        this.oauthStates.delete(state);
      }
    }
  }

  isConfigured(): boolean {
    return !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  }
}
