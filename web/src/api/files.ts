import type { FileItem, PageResult } from "~/types/api";
import { del, get, upload } from "~/request";

/** 文件列表（分页） */
export function listFiles(page = 1, pageSize = 20) {
  return get<PageResult<FileItem>>("/files", { page, pageSize });
}

/** 上传文件 */
export function uploadFile(file: File) {
  return upload<FileItem>("/files/upload", file);
}

/** 删除文件 */
export function deleteFile(id: number) {
  return del<void>(`/files/${id}`);
}

/** 构造下载地址 */
export function fileDownloadUrl(id: number) {
  return `${import.meta.env.VITE_API_BASE_URL}/files/${id}/download`;
}

/** 构造预览地址（内联展示，不触发下载） */
export function filePreviewUrl(id: number) {
  return `${import.meta.env.VITE_API_BASE_URL}/files/${id}/download?inline=1`;
}
