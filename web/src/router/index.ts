import { createRouter, createWebHistory } from "vue-router";
import { setupGuard } from "./guard";

/** 静态基础路由（登录页、布局外壳、错误页） */
export const constantRoutes = [
  {
    path: "/login",
    name: "login",
    component: () => import("../views/login/index.vue"),
    meta: { title: "登录" },
  },
  {
    path: "/",
    name: "layout",
    component: () => import("../layouts/default.vue"),
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        name: "dashboard",
        component: () => import("../views/dashboard/index.vue"),
        meta: { title: "首页", icon: "home" },
      },
      {
        path: "profile",
        name: "profile",
        component: () => import("../views/profile/index.vue"),
        meta: { title: "个人中心", icon: "user" },
      },
    ],
  },
  {
    path: "/403",
    name: "forbidden",
    component: () => import("../views/error/403.vue"),
    meta: { title: "无权限" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("../views/error/404.vue"),
    meta: { title: "页面不存在" },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: constantRoutes,
});

setupGuard(router);

export default router;
