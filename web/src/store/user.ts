import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { JwtPayload } from "~/types/api";

const REFRESH_TOKEN_KEY = "nest-admin:refresh-token";

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export const useUserStore = defineStore("user", () => {
  // accessToken 只存内存态，不持久化（更安全）
  const accessToken = ref<string>("");
  // refreshToken 存 localStorage（后端通过 body 返回，无 httpOnly cookie 可用）
  const refreshToken = ref<string>(localStorage.getItem(REFRESH_TOKEN_KEY) ?? "");

  const payload = ref<JwtPayload | null>(null);

  const userId = computed(() => payload.value?.sub ?? 0);
  const username = computed(() => payload.value?.username ?? "");
  const roles = computed<string[]>(() => payload.value?.roles ?? []);
  const permissions = computed<string[]>(() => payload.value?.permissions ?? []);

  /** 是否超级管理员（通配符权限） */
  const isSuperAdmin = computed(() => permissions.value.includes("*:*:*"));

  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    payload.value = decodeJwt(access);
  }

  function reset() {
    accessToken.value = "";
    refreshToken.value = "";
    payload.value = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  /** 是否拥有指定权限（支持 'a:b:c' 精确匹配与 '*:*:*' 通配） */
  function hasPermission(required: string | string[]): boolean {
    if (isSuperAdmin.value) return true;
    const list = Array.isArray(required) ? required : [required];
    return list.some((item) => permissions.value.includes(item));
  }

  return {
    accessToken,
    refreshToken,
    payload,
    userId,
    username,
    roles,
    permissions,
    isSuperAdmin,
    setTokens,
    reset,
    hasPermission,
  };
});
