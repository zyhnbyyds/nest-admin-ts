/**
 * 客户端真实 IP 解析工具
 *
 * 反向代理（nginx 等）场景下，TCP 对端地址是代理服务器（如 127.0.0.1），
 * 必须从代理转发的头中解析真实客户端 IP，否则登录日志 / 操作日志 / 在线会话
 * 记录的全是代理地址。解析优先级：
 *   1. x-forwarded-for 最左侧地址（nginx 标准转发头，需代理配置
 *      `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`）
 *   2. x-real-ip（部分代理仅配置该头）
 *   3. 回退 TCP 对端地址 request.ip（直连 / 本地调试场景）
 */

type IpRequest = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
};

function header(request: IpRequest, name: string): string | undefined {
  const value = request.headers?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function resolveClientIp(request: IpRequest): string | undefined {
  const forwarded = header(request, 'x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    // 标准格式为逗号分隔的代理链，最左侧是最初发起请求的客户端
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 45);
  }

  const realIp = header(request, 'x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim().slice(0, 45);

  return request.ip;
}