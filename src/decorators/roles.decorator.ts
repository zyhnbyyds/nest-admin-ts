import { SetMetadata } from '@nestjs/common';

export const Roles = (...auths: string[]) => SetMetadata('auth', auths);
