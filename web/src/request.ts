import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { LewMessage } from "lew-ui";
import { useUserStore } from "~/store/user";
import type { LoginResult } from "~/types/api";

/** 业务错误（后端无统一包裹层，直接用 HTTP 状态码 + message） */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

// ---------- 请求拦截器：注入 token ----------
request.interceptors.request.use((config) => {
  const userStore = useUserStore();
  if (userStore.accessToken) {
    config.headers.Authorization = `Bearer ${userStore.accessToken}`;
  }
  return config;
});

// ---------- 刷新排队 ----------
let refreshing: Promise<string> | null = null;

/** 刷新期间挂起的请求队列 */
type PendingCallback = (token: string | null) => void;
const pendingQueue: PendingCallback[] = [];

function flushQueue(token: string | null) {
  while (pendingQueue.length) {
    const cb = pendingQueue.shift();
    cb?.(token);
  }
}

async function doRefresh(): Promise<string> {
  const userStore = useUserStore();
  const refreshToken = userStore.refreshToken;
  if (!refreshToken) throw new ApiError(401, "未登录");
  // 直接用裸 axios，避免循环依赖拦截器
  const { data } = await axios.post<LoginResult>(
    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
    { refreshToken },
    { timeout: 10000 },
  );
  userStore.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

/** 触发一次全局刷新（并发请求共享同一个 Promise） */
function refreshOnce(): Promise<string> {
  if (!refreshing) {
    refreshing = doRefresh()
      .then((token) => {
        flushQueue(token);
        return token;
      })
      .catch((error) => {
        flushQueue(null);
        const userStore = useUserStore();
        userStore.reset();
        // 跳转登录页（避免循环依赖 router，用事件解耦）
        window.dispatchEvent(new CustomEvent("auth:logout"));
        throw error;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// ---------- 响应拦截器：统一错误 + 401 刷新重放 ----------
request.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    // 401：尝试刷新并重放一次
    if (status === 401 && config && !config._retried) {
      config._retried = true;
      try {
        const token = refreshing ? await refreshing : await refreshOnce();
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
        return request(config);
      } catch {
        return Promise.reject(new ApiError(401, "登录已过期，请重新登录"));
      }
    }

    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      (status === 403
        ? "没有操作权限"
        : status === 404
          ? "资源不存在"
          : status && status >= 500
            ? "服务器开小差了，请稍后重试"
            : error.message) ??
      "请求失败";

    // 401 已在上面处理过重试，这里兜底提示
    if (status !== 401) {
      LewMessage.error(message);
    }
    return Promise.reject(new ApiError(status ?? 0, message));
  },
);

/** GET 请求 */
export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await request.get<T>(url, { params });
  return data;
}

/** POST 请求 */
export async function post<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await request.post<T>(url, body);
  return data;
}

/** PATCH 请求 */
export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await request.patch<T>(url, body);
  return data;
}

/** PUT 请求 */
export async function put<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await request.put<T>(url, body);
  return data;
}

/** DELETE 请求 */
export async function del<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await request.delete<T>(url, { params });
  return data;
}

/** 文件上传 */
export async function upload<T>(url: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await request.post<T>(url, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export default request;
