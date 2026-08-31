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
        LewMessage.error("登录已过期，请重新登录");
        throw error;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

// ---------- 错误信息归一化 ----------
/** 把后端/网络层的各种错误形态转成一句可读的中文提示 */
function formatMessage(error: AxiosError): string {
  const status = error.response?.status;
  const raw = (error.response?.data as { message?: unknown } | undefined)
    ?.message;

  // 后端校验失败会返回字段提示数组，如 ["name：不能为空"]
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.filter((m): m is string => typeof m === "string").join("；");
  }
  if (typeof raw === "string" && raw) return raw;

  // 网络层错误
  if (error.code === "ECONNABORTED" || /timeout/i.test(error.message ?? "")) {
    return "请求超时，请稍后重试";
  }
  if (!error.response) return "网络异常，请检查网络连接";

  if (status === 401) return "未登录或登录已过期";
  if (status === 403) return "没有操作权限";
  if (status === 404) return "资源不存在";
  if (status && status >= 500) return "服务器开小差了，请稍后重试";
  return error.message || "请求失败";
}

// ---------- 响应拦截器：统一错误 + 401 刷新重放 ----------
/** 登录/注册/刷新等认证接口不做 401 自动刷新，直接把后端提示展示给用户 */
const NO_REFRESH_URLS = ["/auth/login", "/auth/refresh", "/auth/register"];

request.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const skipRefresh = NO_REFRESH_URLS.some(
      (url) => typeof config?.url === "string" && config.url.includes(url),
    );

    // 401：尝试刷新并重放一次（认证接口重放无意义，直接报错提示）
    if (status === 401 && config && !config._retried && !skipRefresh) {
      config._retried = true;
      try {
        const token = refreshing ? await refreshing : await refreshOnce();
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
        return request(config);
      } catch {
        // 刷新失败已在 refreshOnce 内提示并广播退出登录，这里不再重复提示
        return Promise.reject(new ApiError(401, "登录已过期，请重新登录"));
      }
    }

    const message = formatMessage(error);
    LewMessage.error(message);
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
