import { h } from "vue";

/** 渲染带类名的文本 span（用于表格 customRender） */
export function renderTag(text: string, cssClass: string) {
  return h("span", { class: cssClass }, text);
}

/** 状态标签：active → 启用（绿），disabled → 禁用（红） */
export function renderStatus(status: string | null | undefined) {
  return status === "active"
    ? renderTag("启用", "text-[var(--lew-color-success)]")
    : renderTag("禁用", "text-[var(--lew-color-error)]");
}
