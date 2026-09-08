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
    parts.push(`${label}: ${String(value)}`);
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

// ---------- Markdown 渲染 ----------

/** 对文本做 HTML 转义，防止 XSS */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 解析 Markdown 表格行（去掉首尾 |，按 | 分割） */
function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** 行内 Markdown：加粗 **text** → <strong>，行内代码 `code` → <code> */
function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(
      /`([^`]+)`/g,
      "<code class='px-1 py-0.5 rounded bg-[var(--app-bg-hover)] text-[var(--lew-color-primary)]'>$1</code>",
    );
}

/**
 * 轻量 Markdown 渲染：仅支持表格 + 加粗 + 行内代码 + 段落。
 *
 * 先对内容做 HTML 转义（防 XSS），再转换表格标记为真实 HTML 表格。
 */
export function renderAssistantContent(content: string): string {
  const lines = content.split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // 检测表格起始：当前行以 | 开头，下一行是分隔符（| --- |）
    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^\s*\|[\s:-]+\|/.test(lines[i + 1] ?? "")
    ) {
      const headerCells = parseTableRow(line);
      html.push(
        '<div class="overflow-x-auto my-1.5 rounded-md border border-[var(--app-border)]">',
      );
      html.push('<table class="w-full text-12px">');
      html.push("<thead><tr>");
      for (const cell of headerCells) {
        html.push(
          `<th class="px-2.5 py-1.5 text-left font-600 text-[var(--app-text-primary)] whitespace-nowrap">${escapeHtml(cell)}</th>`,
        );
      }
      html.push("</tr></thead><tbody>");
      i += 2; // 跳过表头和分隔符行
      while (i < lines.length && lines[i]?.trim().startsWith("|")) {
        const cells = parseTableRow(lines[i] ?? "");
        html.push("<tr>");
        for (const cell of cells) {
          html.push(
            `<td class="px-2.5 py-1.5 whitespace-nowrap text-[var(--app-text-primary)]">${escapeHtml(cell)}</td>`,
          );
        }
        html.push("</tr>");
        i++;
      }
      html.push("</tbody></table></div>");
      continue;
    }

    // 普通段落（转义后原样输出，保留换行）
    const escaped = escapeHtml(line);
    html.push(`<div>${inlineMarkdown(escaped)}</div>`);
    i++;
  }

  return html.join("\n");
}

/** 判断 assistant 消息内容是否包含 Markdown 表格（用于切换渲染方式） */
export function hasMarkdownTable(content: string | null): boolean {
  if (!content) return false;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    if ((lines[i] ?? "").trim().startsWith("|") && /^\s*\|[\s:-]+\|/.test(lines[i + 1] ?? "")) {
      return true;
    }
  }
  return false;
}
