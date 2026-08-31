import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { JwtPayload, Profile } from "~/types/api";
import { getProfile as fetchProfileApi } from "~/api/auth";

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
  // 完整资料（GET /auth/profile），含头像；JWT 里没有这些信息
  const profile = ref<Profile | null>(null);

  const userId = computed(() => payload.value?.sub ?? 0);
  const username = computed(() => payload.value?.username ?? "");
  const roles = computed<string[]>(() => payload.value?.roles ?? []);
  const permissions = computed<string[]>(() => payload.value?.permissions ?? []);
  const avatar = computed<string | null>(() => profile.value?.avatar ?? null);

  /** 是否超级管理员（通配符权限） */
  const isSuperAdmin = computed(() => permissions.value.includes("*:*:*"));

  function setTokens(access: string, refresh: string) {
    accessToken.value = access;
    refreshToken.value = refresh;
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    payload.value = decodeJwt(access);
  }

  /** 拉取当前用户完整资料（登录后展示头像/资料用） */
  async function fetchProfile() {
    if (!accessToken.value) return;
    profile.value = await fetchProfileApi();
    return profile.value;
  }

  /** 本地更新资料快照（保存资料后同步，避免再次请求） */
  function setProfile(partial: Partial<Profile>) {
    profile.value = profile.value
      ? { ...profile.value, ...partial }
      : ({ ...partial } as Profile);
  }

  function reset() {
    accessToken.value = "";
    refreshToken.value = "";
    payload.value = null;
    profile.value = null;
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
    profile,
    userId,
    username,
    roles,
    permissions,
    avatar,
    isSuperAdmin,
    setTokens,
    fetchProfile,
    setProfile,
    reset,
    hasPermission,
  };
});