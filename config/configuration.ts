function env(targetName: string) {
  return process.env[targetName];
}

export default () => {
  return {
    server: {
      port: parseInt(env('SERVER_PORT'), 10) || 3000,
      name: env('SERVER_TITLE'),
    },
    database: {
      host: env('DATABASE_HOST'),
      port: parseInt(env('DATABASE_PORT'), 10) || 5210,
      user: env('DATABASE_USER'),
      name: env('DATABASE_NAME'),
      type: env('DATABASE_TYPE'),
      password: env('DATABASE_PASSWORD'),
    },
  };
};
