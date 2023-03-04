function env(targetName: string) {
  return process.env[targetName];
}

export default () => {
  return {
    // 基础相关
    server: {
      port: parseInt(env('SERVER_PORT'), 10) || 3000,
      name: env('SERVER_TITLE'),
    },
    // 数据库相关
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
