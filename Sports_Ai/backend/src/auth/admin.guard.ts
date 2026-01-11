import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '../users/users.service';

export const REQUIRE_ADMIN_KEY = 'requireAdmin';
export const RequireAdmin = () => SetMetadata(REQUIRE_ADMIN_KEY, true);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireAdmin = this.reflector.getAllAndOverride<boolean>(REQUIRE_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireAdmin) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const fullUser = await this.usersService.findById(user.id);

    if (!fullUser || fullUser.role !== 'admin') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Admin access required',
        requiredRole: 'admin',
        currentRole: fullUser?.role || 'user',
      });
    }

    return true;
  }
}
