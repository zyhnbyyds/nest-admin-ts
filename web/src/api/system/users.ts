import type { CreateUserBody, PageResult, UpdateUserBody, User } from "~/types/api";
import { del, get, patch, post } from "~/request";

/** 用户列表（分页） */
export function listUsers(page = 1, pageSize = 20) {
  return get<PageResult<User>>("/system/users", { page, pageSize });
}

/** 新增用户 */
export function createUser(body: CreateUserBody) {
  return post<{ id: number }>("/system/users", body);
}

/** 修改用户 */
export function updateUser(id: number, body: UpdateUserBody) {
  return patch<void>(`/system/users/${id}`, body);
}

/** 删除用户 */
export function deleteUser(id: number) {
  return del<void>(`/system/users/${id}`);
}

/** 分配用户角色（走兼容层接口） */
export function assignRole(userId: number, roleId: number) {
  return post<void>("/user/setRole", { userId, roleId });
}
