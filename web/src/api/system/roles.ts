import type { AssignRoleMenusBody, CreateRoleBody, Role } from "~/types/api";
import { get, post } from "~/request";

/** 角色列表（全量） */
export function listRoles() {
  return get<Role[]>("/system/roles");
}

/** 新增角色 */
export function createRole(body: CreateRoleBody) {
  return post<{ id: number }>("/system/roles", body);
}

/** 设置角色菜单权限 */
export function assignRoleMenus(id: number, body: AssignRoleMenusBody) {
  return post<void>(`/system/roles/${id}/menus`, body);
}

/** 查询角色已分配的菜单 ID（走兼容层接口） */
export function getRoleMenuIds(roleId: number) {
  return post<number[]>("/role/auth/list", { roleId });
}
