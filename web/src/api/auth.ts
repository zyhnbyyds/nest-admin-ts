import type { LoginBody, LoginResult, RegisterBody } from "~/types/api";
import { get, post } from "~/request";
import type { RouteNode } from "~/types/app";

/** 登录 */
export function login(body: LoginBody) {
  return post<LoginResult>("/auth/login", body);
}

/** 注册（注册成功后直接返回令牌） */
export function register(body: RegisterBody) {
  return post<LoginResult>("/auth/register", body);
}

/** 刷新令牌 */
export function refresh(refreshToken: string) {
  return post<LoginResult>("/auth/refresh", { refreshToken });
}

/** 登出（使 refreshToken 失效） */
export function logout(refreshToken: string) {
  return post<{ success: boolean }>("/auth/logout", { refreshToken });
}

/** 获取当前用户动态路由树 */
export function getRoutes() {
  return get<RouteNode[]>("/system/menus/routes");
}
