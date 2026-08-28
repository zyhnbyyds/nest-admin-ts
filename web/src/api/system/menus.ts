import type { CreateMenuBody, Menu, UpdateMenuBody } from "~/types/api";
import { del, get, patch, post } from "~/request";

/** 菜单树（全量） */
export function listMenus() {
  return get<Menu[]>("/system/menus");
}

/** 菜单详情 */
export function getMenu(id: number) {
  return get<Menu>(`/system/menus/${id}`);
}

/** 新增菜单 */
export function createMenu(body: CreateMenuBody) {
  return post<{ id: number }>("/system/menus", body);
}

/** 修改菜单 */
export function updateMenu(id: number, body: UpdateMenuBody) {
  return patch<void>(`/system/menus/${id}`, body);
}

/** 删除菜单 */
export function deleteMenu(id: number) {
  return del<void>(`/system/menus/${id}`);
}
