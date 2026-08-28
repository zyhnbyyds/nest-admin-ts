import type {
  CreateDictDataBody,
  CreateDictTypeBody,
  DictData,
  DictType,
  PageResult,
  UpdateDictDataBody,
  UpdateDictTypeBody,
} from "~/types/api";
import { del, get, patch, post } from "~/request";

// ---------- 字典类型 ----------

export function listDictTypes(page = 1, pageSize = 20) {
  return get<PageResult<DictType>>("/system/dict-types", { page, pageSize });
}

export function createDictType(body: CreateDictTypeBody) {
  return post<{ id: number }>("/system/dict-types", body);
}

export function updateDictType(id: number, body: UpdateDictTypeBody) {
  return patch<void>(`/system/dict-types/${id}`, body);
}

export function deleteDictType(id: number) {
  return del<void>(`/system/dict-types/${id}`);
}

// ---------- 字典数据 ----------

export function listDictData(page = 1, pageSize = 20, type?: string) {
  return get<PageResult<DictData>>("/system/dict-data", {
    page,
    pageSize,
    type,
  });
}

/** 按类型获取启用的字典数据（用于下拉选项） */
export function getDictByType(type: string) {
  return get<
    {
      label: string;
      value: string;
      cssClass: string | null;
      listClass: string | null;
      sort: number;
    }[]
  >(`/system/dict-data/type/${type}`);
}

export function createDictData(body: CreateDictDataBody) {
  return post<{ id: number }>("/system/dict-data", body);
}

export function updateDictData(id: number, body: UpdateDictDataBody) {
  return patch<void>(`/system/dict-data/${id}`, body);
}

export function deleteDictData(id: number) {
  return del<void>(`/system/dict-data/${id}`);
}
