import type { AiApprovalResult, AiMessage } from "~/types/api";

// ---------- 审批结果元数据 ----------

/** 是否为后端生成的兜底短句（无实质正文，仅需结果条标题即可） */
export function isPlainOutcome(content: string): boolean {
  const t = content.trim();
  if (!t) return true;
  return !t.includes("\n") && t.length <= 50 && /^操作「.+」已(执行完成|取消)/.test(t);
}

/** 提取消息中持久化的审批结果元数据（存于 toolResults[0]，用于结果条展示） */
export function approvalResultOf(message: AiMessage): AiApprovalResult | undefined {
  const first = message.toolResults?.[0] as AiApprovalResult | undefined;
  return first && first.type === "approval_result" ? first : undefined;
}

/**
 * AI 操作页展示辅助函数。
 *
 * 纯函数集合：Markdown 渲染、风险等级、任务步骤状态、Tool 参数格式化等。
 * 供各展示组件复用，避免逻辑散落在模板中。
 */

// ---------- 风险等级 ----------

export type RiskColor = "success" | "warning" | "danger";

/** 风险等级标签颜色 */
export function riskColor(level: string): RiskColor {
  if (level === "L0" || level === "L1") return "success";
  if (level === "L2") return "warning";
  return "danger";
}

export function riskText(level: string): string {
  const map: Record<string, string> = {
    L0: "L0 只读",
    L1: "L1 低风险",
    L2: "L2 中风险",
    L3: "L3 高风险",
  };
  return map[level] ?? level;
}

// ---------- 任务步骤状态 ----------

export type StepColor = "success" | "warning" | "danger" | "info";

/** 任务步骤状态颜色 */
export function stepColor(status: string): StepColor {
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "danger";
  if (status === "RUNNING") return "warning";
  return "info";
}

export function stepText(status: string): string {
  const map: Record<string, string> = {
    PENDING: "等待中",
    RUNNING: "执行中",
    SUCCESS: "成功",
    FAILED: "失败",
    SKIPPED: "已跳过",
    WAITING_APPROVAL: "等待确认",
    CANCELLED: "已取消",
  };
  return map[status] ?? status;
}

// ---------- Tool 调用 ----------

/** 判断 Tool 返回结果是否为分页用户列表 */
export function isUserList(result: unknown): boolean {
  return (
    !!result &&
    typeof result === "object" &&
    Array.isArray((result as { items?: unknown }).items) &&
    (result as { items?: unknown[] }).items!.length > 0
  );
}

/** 格式化工具参数为简洁文本 */
export function formatArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(args ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    const label = { page: "页码", pageSize: "每页", status: "状态", keyword: "关键字" }[key] ?? key;
    // 对象/数组值序列化为紧凑 JSON，避免 String(object) 抛错
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    parts.push(`${label}: ${text}`);
  }
  return parts.length ? parts.join(" · ") : "无参数";
}

// ---------- 用户列表表格 ----------

export const USER_TABLE_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "username", label: "用户名" },
  { key: "displayName", label: "显示名" },
  { key: "email", label: "邮箱" },
  { key: "deptName", label: "部门" },
  { key: "roleNames", label: "角色" },
  { key: "status", label: "状态" },
] as const;

/** 获取用户列表单元格显示值 */
export function userCellValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join("、") : "-";
  return String(value);
}

/** 判断某列是否为状态列（渲染标签） */
export function isStatusColumn(key: string): boolean {
  return key === "status";
}
