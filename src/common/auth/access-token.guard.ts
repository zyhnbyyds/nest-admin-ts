import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jwtVerify } from 'jose';
import { AppConfigService } from '../../config/app-config.service';
import { IS_PUBLIC } from './public.decorator';
import { REQUIRED_PERMISSIONS } from './permissions.decorator';

type RequestUser = {
  id: number;
  username: string;
  permissions: string[];
  roles: string[];
};
type RequestWithUser = {
  headers: Record<string, string | string[] | undefined>;
  user?: RequestUser;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = request.headers.authorization
      ?.toString()
      .match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException();
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(this.config.jwt.JWT_ACCESS_SECRET),
        {
          issuer: this.config.jwt.JWT_ISSUER,
          audience: this.config.jwt.JWT_AUDIENCE,
        },
      );
      const id = Number(payload.sub);
      if (!Number.isSafeInteger(id) || typeof payload.username !== 'string')
        throw new UnauthorizedException();
      request.user = {
        id,
        username: payload.username,
        permissions: Array.isArray(payload.permissions)
          ? payload.permissions.filter(
              (value): value is string => typeof value === 'string',
            )
          : [],
        roles: Array.isArray(payload.roles)
          ? payload.roles.filter(
              (value): value is string => typeof value === 'string',
            )
          : [],
      };
      const required =
        this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
          context.getHandler(),
          context.getClass(),
        ]) ?? [];
      if (
        required.length &&
        !required.some(
          (permission) =>
            request.user?.permissions.includes(permission) ||
            request.user?.permissions.includes('*:*:*'),
        )
      )
        throw new UnauthorizedException('Insufficient permission');
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException();
    }
  }
}
