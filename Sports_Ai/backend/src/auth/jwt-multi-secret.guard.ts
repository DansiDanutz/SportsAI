import { Injectable, ExecutionContext, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtRotationService } from './jwt-rotation.service';
import { ExtractJwt } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from './auth.service';

/**
 * Custom JWT Guard that supports multiple secrets for rotation
 * Tries all active secrets before rejecting the token
 */
@Injectable()
export class JwtMultiSecretGuard extends AuthGuard('jwt') {
  private secretsCache: Array<{ secret: string; version: number }> = [];
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @Inject(forwardRef(() => JwtRotationService))
    private jwtRotationService: JwtRotationService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract token
    const cookieExtractor = (req: any): string | null => {
      const token =
        req?.cookies?.sportsai_access_token ||
        req?.cookies?.access_token ||
        req?.cookies?.accessToken;
      return typeof token === 'string' && token.length ? token : null;
    };

    const token = cookieExtractor(request) || ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Try to verify with multiple secrets
    const payload = await this.verifyWithMultipleSecrets(token);
    
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // Attach payload to request for the strategy
    request.user = payload;

    // Call parent guard
    return super.canActivate(context) as Promise<boolean>;
  }

  /**
   * Verify JWT token by trying multiple secrets
   */
  private async verifyWithMultipleSecrets(token: string): Promise<JwtPayload | null> {
    // Refresh cache if expired
    if (Date.now() > this.cacheExpiry || this.secretsCache.length === 0) {
      try {
        const secrets = await this.jwtRotationService.getActiveSecrets();
        this.secretsCache = secrets.map(s => ({ secret: s.secret, version: s.version }));
        this.cacheExpiry = Date.now() + this.CACHE_TTL;
      } catch (error) {
        // Fallback to environment variable
        const fallbackSecret = process.env.JWT_SECRET || 'sportsai-secret-key-change-in-production';
        this.secretsCache = [{ secret: fallbackSecret, version: 0 }];
        this.cacheExpiry = Date.now() + this.CACHE_TTL;
      }
    }

    // Try each secret
    for (const secretData of this.secretsCache) {
      try {
        const decoded = jwt.verify(token, secretData.secret) as JwtPayload;
        return decoded;
      } catch (err) {
        // Continue to next secret
        continue;
      }
    }

    // Fallback to environment variable
    const fallbackSecret = process.env.JWT_SECRET || 'sportsai-secret-key-change-in-production';
    try {
      const decoded = jwt.verify(token, fallbackSecret) as JwtPayload;
      return decoded;
    } catch {
      return null;
    }
  }
}
