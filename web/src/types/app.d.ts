export type ColorMode = "light" | "dark" | "auto";

/** 后端 GET /system/menus/routes 返回的动态路由节点 */
export interface RouteNode {
  id: number;
  parentId: number;
  name: string;
  path: string | null;
  component: string | null;
  permission: string | null;
  type: "M" | "C" | "F";
  meta: {
    title: string;
    icon: string | null;
    sort: number;
    cacheable: boolean;
    external: boolean;
    visible: boolean;
  };
  children: RouteNode[];
}

export interface SidebarItem {
  key: string;
  label: string;
  icon: string | null;
  path: string;
  children?: SidebarItem[];
}

export interface TabItem {
  name: string;
  path: string;
  title: string;
  closable: boolean;
}
