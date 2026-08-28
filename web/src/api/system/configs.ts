import type { Config, CreateConfigBody, PageResult, UpdateConfigBody } from "~/types/api";
import { del, get, patch, post } from "~/request";

/** 参数列表（分页） */
export function listConfigs(page = 1, pageSize = 20) {
  return get<PageResult<Config>>("/system/configs", { page, pageSize });
}

/** 按键查询参数 */
export function getConfigByKey(key: string) {
  return get<Config>(`/system/configs/key/${key}`);
}

/** 新增参数 */
export function createConfig(body: CreateConfigBody) {
  return post<{ id: number }>("/system/configs", body);
}

/** 修改参数 */
export function updateConfig(id: number, body: UpdateConfigBody) {
  return patch<void>(`/system/configs/${id}`, body);
}

/** 删除参数 */
export function deleteConfig(id: number) {
  return del<void>(`/system/configs/${id}`);
}
