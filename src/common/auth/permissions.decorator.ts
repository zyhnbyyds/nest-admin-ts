import { SetMetadata } from '@nestjs/common';
export const REQUIRED_PERMISSIONS = Symbol('requiredPermissions');
export const RequirePermissions = (...permissions: string[]): MethodDecorator & ClassDecorator => SetMetadata(REQUIRED_PERMISSIONS, permissions);
