import type { CacheInfo, LoginLog, OnlineSession, OperationLog, PageResult } from "~/types/api";
import { del, get } from "~/request";

// ---------- 登录日志 ----------

export function listLoginLogs(
  page = 1,
  pageSize = 20,
  query?: { username?: string; status?: string },
) {
  return get<PageResult<LoginLog>>("/monitor/login-logs", {
    page,
    pageSize,
    ...query,
  });
}

export function deleteLoginLog(id: number) {
  return del<void>(`/monitor/login-logs/${id}`);
}

export function clearLoginLogs() {
  return del<void>("/monitor/login-logs");
}

// ---------- 操作日志 ----------

export function listOperationLogs(
  page = 1,
  pageSize = 20,
  query?: { status?: string; userId?: number },
) {
  return get<PageResult<OperationLog>>("/monitor/operation-logs", {
    page,
    pageSize,
    ...query,
  });
}

export function deleteOperationLog(id: number) {
  return del<void>(`/monitor/operation-logs/${id}`);
}

export function clearOperationLogs() {
  return del<void>("/monitor/operation-logs");
}

// ---------- 在线用户 ----------

export function listOnlineUsers() {
  return get<OnlineSession[]>("/monitor/online");
}

/** 强制下线 */
export function forceLogout(userId: number) {
  return del<void>(`/monitor/online/${userId}`);
}

// ---------- 缓存监控 ----------

export function getCacheInfo() {
  return get<CacheInfo>("/monitor/cache");
}
