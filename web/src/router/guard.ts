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
        // 拉取当前用户完整资料（头像等 JWT 之外的信息），失败不阻塞导航
        void userStore.fetchProfile().catch(() => undefined);
        // 重新进入目标路由（此时动态路由已注册）。
        // 注意不能直接 return { ...to }：刷新时首个导航会命中兜底路由，
        // to.name 为 "not-found"，重定向按 name 解析会再次命中兜底路由导致 404，
        // 必须只保留 path/query/hash，按 path 重新解析。
        return {
          path: to.path,
          query: to.query,
          hash: to.hash,
          replace: true,
        };
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
