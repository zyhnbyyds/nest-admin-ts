import type {
  ChangePasswordBody,
  LoginBody,
  LoginResult,
  RegisterBody,
  UpdateProfileBody,
} from "~/types/api";
import { get, patch, post } from "~/request";
import type { RouteNode } from "~/types/app";

/** 登录 */
export function login(body: LoginBody) {
  return post<LoginResult>("/auth/login", body);
}

/** 注册（注册成功后直接返回令牌） */
export function register(body: RegisterBody) {
  return post<LoginResult>("/auth/register", body);
}

/** 更新当前用户资料 */
export function updateProfile(body: UpdateProfileBody) {
  return patch<{ success: boolean }>("/auth/profile", body);
}

/** 修改当前用户密码 */
export function changePassword(body: ChangePasswordBody) {
  return patch<{ success: boolean }>("/auth/password", body);
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
