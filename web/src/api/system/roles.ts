import type { AssignRoleMenusBody, CreateRoleBody, Role, UpdateRoleBody } from "~/types/api";
import { del, get, patch, post } from "~/request";

/** 角色列表（全量） */
export function listRoles() {
  return get<Role[]>("/system/roles");
}

/** 新增角色 */
export function createRole(body: CreateRoleBody) {
  return post<{ id: number }>("/system/roles", body);
}

/** 修改角色 */
export function updateRole(id: number, body: UpdateRoleBody) {
  return patch<void>(`/system/roles/${id}`, body);
}

/** 删除角色 */
export function deleteRole(id: number) {
  return del<void>(`/system/roles/${id}`);
}

/** 设置角色菜单权限 */
export function assignRoleMenus(id: number, body: AssignRoleMenusBody) {
  return post<void>(`/system/roles/${id}/menus`, body);
}

/** 查询角色已分配的菜单 ID（走兼容层接口，返回 { code, data, message } 包裹格式） */
export async function getRoleMenuIds(roleId: number) {
  const res = await post<{ code: number; data: number[]; message: string }>("/role/auth/list", {
    roleId,
  });
  return res.data;
}
