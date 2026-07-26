import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.service';
import { getJwtSecret } from './auth-secret-policy';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    const cookieExtractor = (req: any): string | null => {
      // Works with Fastify + @fastify/cookie (req.cookies)
      const token =
        req?.cookies?.sportsai_access_token ||
        req?.cookies?.access_token ||
        req?.cookies?.accessToken;
      return typeof token === 'string' && token.length ? token : null;
    };

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    // If payload was already verified by JwtMultiSecretGuard, use it
    // Otherwise, validate normally
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
