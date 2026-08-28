import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { RouteRecordRaw } from "vue-router";
import type { RouteNode, SidebarItem } from "~/types/app";
import { getRoutes } from "~/api/auth";

/** 组件路径 → 动态导入映射（views 目录） */
const viewModules = import.meta.glob("../views/**/*.vue");

function resolveComponent(component: string | null) {
  if (!component) return undefined;
  // component 形如 'system/users/index'，映射到 ../views/system/users/index.vue
  const importer =
    viewModules[`../views/${component}.vue`] ?? viewModules[`../views/${component}/index.vue`];
  return importer;
}

/** 后端 RouteNode → vue-router RouteRecordRaw */
function toRouteRecord(node: RouteNode): RouteRecordRaw | null {
  if (node.type === "F") return null;

  const children = node.children
    .map(toRouteRecord)
    .filter((item): item is RouteRecordRaw => item !== null);

  const isLeaf = children.length === 0;
  const component = resolveComponent(node.component);

  // 目录节点：无 component，仅作为布局容器
  if (!isLeaf && !component) {
    return {
      path: node.path ?? `/${node.name}`,
      name: node.name,
      meta: { title: node.meta.title, icon: node.meta.icon, cacheable: node.meta.cacheable },
      children,
    };
  }

  const record: RouteRecordRaw = {
    path: node.path ?? node.name,
    name: node.name,
    component: component ?? (() => import("../views/error/404.vue")),
    meta: { title: node.meta.title, icon: node.meta.icon, cacheable: node.meta.cacheable },
    children: isLeaf ? undefined : children,
  };
  return record;
}

/** RouteNode 树 → 侧边栏数据 */
function toSidebarItems(nodes: RouteNode[]): SidebarItem[] {
  return nodes
    .filter((node) => node.type !== "F" && node.meta.visible)
    .map((node) => ({
      key: node.name,
      label: node.meta.title,
      icon: node.meta.icon,
      path: node.path ?? `/${node.name}`,
      children: node.children.length ? toSidebarItems(node.children) : undefined,
    }));
}

export const usePermissionStore = defineStore("permission", () => {
  const routes = ref<RouteRecordRaw[]>([]);
  const sidebar = ref<SidebarItem[]>([]);
  const loaded = ref(false);

  const firstMenuPath = computed(() => {
    const first = sidebar.value[0];
    if (!first) return "/dashboard";
    return first.children?.length ? first.children[0]!.path : first.path;
  });

  /** 拉取当前用户路由树并转换为路由记录 */
  async function generateRoutes(): Promise<RouteRecordRaw[]> {
    const tree = await getRoutes();
    const records = tree.map(toRouteRecord).filter((item): item is RouteRecordRaw => item !== null);
    routes.value = records;
    sidebar.value = toSidebarItems(tree);
    loaded.value = true;
    return records;
  }

  function reset() {
    routes.value = [];
    sidebar.value = [];
    loaded.value = false;
  }

  return { routes, sidebar, loaded, firstMenuPath, generateRoutes, reset };
});
