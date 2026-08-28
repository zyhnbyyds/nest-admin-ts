import dayjs from "dayjs";

/** 格式化日期时间 */
export function formatDateTime(
  value: string | Date | null | undefined,
  template = "YYYY-MM-DD HH:mm:ss",
): string {
  if (!value) return "-";
  return dayjs(value).format(template);
}

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
