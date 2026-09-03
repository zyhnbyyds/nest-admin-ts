/**
 * PM2 进程配置 —— 仅部署后端 server（不包含 web 前端）
 *
 * 部署目录：/usr/apps/nest-admin-ts
 * 监听端口：1011（通过 PORT 环境变量注入，main.ts 中 app.listen({ port }) 读取）
 *
 * 使用步骤：
 *   1. 将代码放到 /usr/apps/nest-admin-ts（git clone 或 rsync）
 *   2. 安装依赖并构建（构建需要 devDependencies，构建完再裁剪成生产依赖以省内存）：
 *        cd /usr/apps/nest-admin-ts
 *        bun install
 *        bun run build
 *        bun install --production
 *   3. 配置环境变量：复制 .env.example 为 .env，填写 DATABASE_URL / JWT 密钥等
 *      （PM2 的 env 优先级高于 .env 中的同名变量）
 *   4. 启动并保存：
 *        mkdir -p /usr/apps/nest-admin-ts/logs
 *        pm2 start ecosystem.config.js
 *        pm2 save          # 配合 pm2 startup 实现开机自启
 *   5. 常用命令：
 *        pm2 status / pm2 logs nest-admin-server / pm2 restart nest-admin-server
 *   6. 记得在防火墙/安全组放行 TCP 1011；如需域名可再配一层反向代理
 */
module.exports = {
  apps: [
    {
      name: 'nest-admin-server',
      cwd: '/usr/apps/nest-admin-ts',
      script: 'src/main.ts',

      // ---- 少占用：单进程 fork 模式，不启用 cluster ----
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      interpreter: 'bun',
      // ---- 资源上限（内存用量如需更低可继续调小） ----
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=384 --smol', // 限制 V8 堆上限，防止无谓膨胀

      // ---- 可靠性 ----
      autorestart: true,
      restart_delay: 3000, // 崩溃后延迟 3s 再重启，避免重启风暴
      min_uptime: '10s', // 存活不足 10s 视为启动失败，不按崩溃计数
      kill_signal: 'SIGTERM',
      kill_timeout: 10000, // 给 Nest 优雅关停（enableShutdownHooks）留时间

      // ---- 日志（集中到部署目录，便于查看与归档） ----
      time: true, // 日志行带时间戳
      merge_logs: true,
      out_file: '/usr/apps/nest-admin-ts/logs/out.log',
      error_file: '/usr/apps/nest-admin-ts/logs/error.log',

      // ---- 环境变量 ----
      env: {
        NODE_ENV: 'production',
        PORT: '1011',
        // 其余变量（DATABASE_URL、REDIS_URL、JWT_*、CORS_ORIGINS 等）放 .env，
        // 项目通过 @nestjs/config 自动加载
      },
    },
  ],
};
