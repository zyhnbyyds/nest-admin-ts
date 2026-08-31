import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
// 系统面向中国大陆：所有时间统一按东八区（北京时间）展示，
// 避免浏览器/服务器时区差异导致写入时间看起来"错位 8 小时"
dayjs.tz.setDefault("Asia/Shanghai");

/** 格式化日期时间（固定东八区） */
export function formatDateTime(
  value: string | Date | null | undefined,
  template = "YYYY-MM-DD HH:mm:ss",
): string {
  if (!value) return "-";
  return dayjs(value).tz().format(template);
}

/** 格式化文件大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}