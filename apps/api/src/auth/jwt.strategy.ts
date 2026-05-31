import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, isPlatformUser } from '../common/auth.types';
import { AuthService } from './auth.service';
import { PlatformAuthService } from '../platform/platform-auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
    private readonly platformAuthService: PlatformAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (isPlatformUser(payload)) {
      const platformUser = await this.platformAuthService.validateById(
        payload.id,
      );
      if (!platformUser) {
        throw new UnauthorizedException('Platform user no longer exists');
      }
      return platformUser;
    }

    const user = await this.authService.validateUserById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return user;
  }
}
