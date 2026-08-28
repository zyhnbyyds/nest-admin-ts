import type { ColumnMeta } from "~/types/api";
import { get, post } from "~/request";

export interface TableInfo {
  tableName: string;
  comment: string;
  createdAt: string | null;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

/** 数据库表列表 */
export function listTables() {
  return get<TableInfo[]>("/generator/tables");
}

/** 表字段信息 */
export function getTableColumns(table: string) {
  return get<ColumnMeta[]>(`/generator/tables/${table}/columns`);
}

/** 预览生成代码 */
export function previewCode(table: string) {
  return post<{ table: string; files: GeneratedFile[] }>("/generator/preview", { table });
}

/** 生成代码文件 */
export function generateCode(table: string, directory: string) {
  return post<{ table: string; files: GeneratedFile[] }>("/generator/generate", {
    table,
    directory,
  });
}
