import * as Joi from 'joi';

export function handleEnvFilePath() {
  const isDev = process.env.NEST_ENVIRONMENT === 'dev';
  const envFilePath = ['.env'];
  isDev
    ? envFilePath.unshift('.env.development')
    : envFilePath.unshift('.env.production');
  console.log(envFilePath);

  return envFilePath;
}

export function handleValidationSchema() {
  return Joi.object({
    SERVER_PORT: Joi.number().default(521),
    SERVER_TITLE: Joi.string().default('NestAdminTs'),
    DATABASE_USER: Joi.string().default('test'),
    DATABASE_PASSWORD: Joi.string().default('123456'),
    DATABASE_PORT: Joi.number().default(521),
    DATABASE_HOST: Joi.string().default('localhost'),
    DATABASE_NAME: Joi.string().default('nest'),
    DATABASE_TYPE: Joi.string().default('mysql'),
    SECRET_KEY: Joi.string().default('nest'),
    NEST_ENVIRONMENT: Joi.valid('prod', 'dev', 'local').default('local'),
  });
}
