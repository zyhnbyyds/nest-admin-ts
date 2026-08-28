import type { CreateDeptBody, Dept, UpdateDeptBody } from "~/types/api";
import { del, get, patch, post } from "~/request";

/** 部门树（全量） */
export function listDepts() {
  return get<Dept[]>("/system/depts");
}

/** 部门详情 */
export function getDept(id: number) {
  return get<Dept>(`/system/depts/${id}`);
}

/** 新增部门 */
export function createDept(body: CreateDeptBody) {
  return post<{ id: number }>("/system/depts", body);
}

/** 修改部门 */
export function updateDept(id: number, body: UpdateDeptBody) {
  return patch<void>(`/system/depts/${id}`, body);
}

/** 删除部门 */
export function deleteDept(id: number) {
  return del<void>(`/system/depts/${id}`);
}
