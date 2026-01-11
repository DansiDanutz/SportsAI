import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';

export const REQUIRE_PREMIUM_KEY = 'requirePremium';
export const RequirePremium = () => SetMetadata(REQUIRE_PREMIUM_KEY, true);

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirePremium = this.reflector.getAllAndOverride<boolean>(REQUIRE_PREMIUM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirePremium) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const fullUser = await this.usersService.findById(user.id);

    if (!fullUser || fullUser.subscriptionTier !== 'premium') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Premium subscription required to access this feature',
        requiredTier: 'premium',
        currentTier: fullUser?.subscriptionTier || 'free',
      });
    }

    return true;
  }
}
