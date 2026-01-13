import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { JwtStrategy } from './jwt.strategy';
import { RateLimiterService } from './rate-limiter.service';
import { ApiRateLimiterService } from './api-rate-limiter.service';
import { ApiRateLimitGuard } from './api-rate-limit.guard';
import { AdminGuard } from './admin.guard';
import { TwoFactorService } from './two-factor.service';
import { DeviceSessionService } from './device-session.service';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Global()
@Module({
  imports: [
    UsersModule,
    PrismaModule,
    AiModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'sportsai-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleOAuthService,
    JwtStrategy,
    RateLimiterService,
    ApiRateLimiterService,
    AdminGuard,
    ApiRateLimitGuard,
    TwoFactorService,
    DeviceSessionService,
    // Apply API rate limiting globally to all routes
    {
      provide: APP_GUARD,
      useClass: ApiRateLimitGuard,
    },
  ],
  exports: [AuthService, GoogleOAuthService, JwtModule, AdminGuard, ApiRateLimiterService, ApiRateLimitGuard, TwoFactorService, DeviceSessionService],
})
export class AuthModule {}
