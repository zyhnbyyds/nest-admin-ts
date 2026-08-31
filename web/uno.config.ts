import { defineConfig, presetAttributify, presetIcons, presetWind4 } from "unocss";

export default defineConfig({
  presets: [
    presetWind4({ preflights: { reset: false } }),
    presetAttributify(),
    presetIcons({ scale: 1.2 }),
  ],
  shortcuts: {
    // 卡片：细边框 + 极浅阴影
    "app-card":
      "rounded-10px bg-[var(--app-bg-card)] border border-[var(--app-border)] shadow-[var(--app-shadow)] transition-shadow duration-200",
    // 页面容器
    "page-container":
      "p-5 flex flex-col gap-4 rounded-10px bg-[var(--app-bg-card)] border border-[var(--app-border)] shadow-[var(--app-shadow)]",
    // 页面标题层级
    "page-title": "text-20px font-700 tracking--1%",
    "page-subtitle": "text-13px text-[var(--app-text-secondary)]",
    // 图标按钮
    "icon-btn":
      "flex items-center justify-center w-32px h-32px rounded-8px bg-transparent border-none cursor-pointer text-[var(--app-text-secondary)] transition-colors duration-200 hover:bg-[var(--app-bg-hover)] hover:text-[var(--app-text-primary)]",
    // 表格基础
    "table-base": "w-full border-collapse text-13.5px",
    "table-th":
      "px-3 py-2.5 text-left font-600 text-[var(--app-text-muted)] border-b border-[var(--app-border)]",
    "table-td": "px-3 py-2.5 border-b border-[var(--app-border)]",
    // 状态标签
    "tag-success": "text-[var(--lew-color-success)]",
    "tag-failure": "text-[var(--lew-color-error)]",
    // 空状态
    "table-empty": "text-center text-[var(--app-text-muted)] py-6",
  },
});
