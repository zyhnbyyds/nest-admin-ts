import type { Router } from "vue-router";
import { usePermissionStore } from "~/store/permission";
import { useUserStore } from "~/store/user";

const WHITE_LIST = ["/login"];

/** 动态路由是否已注册 */
let dynamicRoutesAdded = false;

export function resetRouteFlag() {
  dynamicRoutesAdded = false;
}

export function setupGuard(router: Router) {
  router.beforeEach(async (to) => {
    const userStore = useUserStore();
    const permissionStore = usePermissionStore();

    // 白名单直接放行
    if (WHITE_LIST.includes(to.path)) {
      // 已登录访问登录页 → 跳首页
      if (userStore.accessToken) return "/";
      return true;
    }

    // 未登录 → 登录页（带 redirect）
    if (!userStore.accessToken && !userStore.refreshToken) {
      return { path: "/login", query: { redirect: to.fullPath } };
    }

    // 有 refreshToken 但内存态 accessToken 丢失（刷新页面）→ 等待请求拦截器自动刷新
    // 这里先放行，request.ts 的 401 重试机制会完成刷新
    if (!dynamicRoutesAdded) {
      try {
        const records = await permissionStore.generateRoutes();
        records.forEach((record) => router.addRoute("layout", record));
        dynamicRoutesAdded = true;
        // 重新进入目标路由（此时动态路由已注册）
        return { ...to, replace: true };
      } catch {
        userStore.reset();
        return { path: "/login", query: { redirect: to.fullPath } };
      }
    }

    return true;
  });

  router.afterEach((to) => {
    const title = to.meta.title as string | undefined;
    document.title = title ? `${title} - Nest Admin` : "Nest Admin";
  });
}
