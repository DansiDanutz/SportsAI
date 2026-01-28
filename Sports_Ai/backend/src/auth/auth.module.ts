import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { GitHubOAuthService } from './github-oauth.service';
import { JwtStrategy } from './jwt.strategy';
import { RateLimiterService } from './rate-limiter.service';
import { ApiRateLimiterService } from './api-rate-limiter.service';
import { ApiRateLimitGuard } from './api-rate-limit.guard';
import { AdminGuard } from './admin.guard';
import { TwoFactorService } from './two-factor.service';
import { DeviceSessionService } from './device-session.service';
import { JwtRotationService } from './jwt-rotation.service';
import { JwtMultiSecretGuard } from './jwt-multi-secret.guard';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  imports: [
    UsersModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: async (jwtRotation: JwtRotationService) => {
        const secret = await jwtRotation.getActiveSecret();
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
      inject: [JwtRotationService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleOAuthService,
    GitHubOAuthService,
    JwtStrategy,
    JwtMultiSecretGuard,
    JwtRotationService,
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
  exports: [AuthService, GoogleOAuthService, GitHubOAuthService, JwtModule, AdminGuard, ApiRateLimiterService, ApiRateLimitGuard, TwoFactorService, DeviceSessionService, JwtRotationService, JwtMultiSecretGuard],
})
export class AuthModule {}
