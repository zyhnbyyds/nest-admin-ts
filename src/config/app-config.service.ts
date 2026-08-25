import { Injectable } from '@nestjs/common';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'), PORT: z.coerce.number().int().min(1).max(65535).default(3000), API_PREFIX: z.string().default('api/v1'),
  DATABASE_URL: z.string().url(), REDIS_URL: z.string().url().optional(), JWT_ISSUER: z.string().min(1), JWT_AUDIENCE: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32), JWT_REFRESH_SECRET: z.string().min(32), JWT_ACCESS_TTL: z.string().default('15m'), JWT_REFRESH_TTL: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:9527'), UPLOAD_DIR: z.string().default('uploads'),
});
export type AppEnvironment = z.infer<typeof envSchema>;

@Injectable()
export class AppConfigService {
  private readonly values: AppEnvironment = envSchema.parse(process.env);
  get port(): number { return this.values.PORT; }
  get apiPrefix(): string { return this.values.API_PREFIX; }
  get databaseUrl(): string { return this.values.DATABASE_URL; }
  get redisUrl(): string | undefined { return this.values.REDIS_URL; }
  get corsOrigins(): string[] { return this.values.CORS_ORIGINS.split(',').map((value) => value.trim()); }
  get environment(): AppEnvironment['NODE_ENV'] { return this.values.NODE_ENV; }
  get jwt(): Pick<AppEnvironment, 'JWT_ISSUER' | 'JWT_AUDIENCE' | 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET' | 'JWT_ACCESS_TTL' | 'JWT_REFRESH_TTL'> {
    const { JWT_ISSUER, JWT_AUDIENCE, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_TTL, JWT_REFRESH_TTL } = this.values;
    return { JWT_ISSUER, JWT_AUDIENCE, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_ACCESS_TTL, JWT_REFRESH_TTL };
  }
}
