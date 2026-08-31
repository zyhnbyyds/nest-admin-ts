import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useDark, useToggle } from "@vueuse/core";
import type { ColorMode, RadiusLevel } from "~/types/app";
import { buildPrimaryPalette } from "~/utils/color";

const MODE_KEY = "nest-admin:color-mode";
const PRIMARY_KEY = "nest-admin:primary-color";
const RADIUS_KEY = "nest-admin:radius";
// useDark 内部布尔存储 key（与 mode 的枚举存储分离，避免互相覆盖）
const DARK_FLAG_KEY = "nest-admin:dark-flag";

/** 可选主题色（与 lew-ui 色板对齐） */
export const THEME_COLORS: { label: string; value: string }[] = [
  { label: "蓝", value: "#1a73e8" },
  { label: "绿", value: "#2e9e5b" },
  { label: "红", value: "#e5484d" },
  { label: "橙", value: "#f76b15" },
  { label: "紫", value: "#8b5cf6" },
  { label: "青", value: "#0ea5a4" },
];

/** 圆角档位（对应 lew-ui --lew-border-radius-*） */
export const RADIUS_LEVELS: { label: string; value: RadiusLevel; desc: string }[] = [
  { label: "圆角", value: "round", desc: "8px" },
  { label: "中等", value: "medium", desc: "12px" },
  { label: "圆润", value: "large", desc: "16px" },
];

const RADIUS_MAP: Record<
  RadiusLevel,
  { mini: string; small: string; medium: string; large: string }
> = {
  round: { mini: "4px", small: "8px", medium: "12px", large: "16px" },
  medium: { mini: "6px", small: "10px", medium: "14px", large: "18px" },
  large: { mini: "8px", small: "12px", medium: "16px", large: "20px" },
};

/** 覆盖 lew-ui 主色完整派生变量，保证任意自定义色都协调 */
function applyPrimaryColor(color: string) {
  const root = document.documentElement;
  const p = buildPrimaryPalette(color);
  const vars: Record<string, string> = {
    "--lew-color-primary": p.primary,
    "--lew-color-primary-hover": p.hover,
    "--lew-color-primary-active": p.active,
    "--lew-color-primary-dark": p.dark,
    "--lew-color-primary-light": p.light,
    "--lew-color-primary-light-hover": p.lightHover,
    "--lew-color-primary-light-active": p.lightActive,
    "--lew-color-primary-light-text": p.lightText,
    "--lew-color-primary-light-text-hover": p.lightTextHover,
    "--lew-color-primary-light-text-active": p.lightTextActive,
    "--lew-color-primary-ghost-text": p.ghostText,
    "--lew-color-primary-ghost-text-hover": p.ghostTextHover,
    "--lew-color-primary-ghost-text-active": p.ghostTextActive,
    "--lew-color-primary-text-text": p.textText,
    "--lew-color-primary-text-text-hover": p.textTextHover,
    "--lew-color-primary-text-text-active": p.textTextActive,
    // 按钮
    "--lew-color-button-primary-fill": p.primary,
    "--lew-color-button-primary-fill-hover": p.hover,
    "--lew-color-button-primary-fill-hover-base": p.hover,
    "--lew-color-button-primary-fill-active": p.active,
    "--lew-color-button-primary-fill-active-base": p.active,
    "--lew-color-button-primary-fill-text": "#fafafc",
    "--lew-color-button-primary-fill-text-hover": "#fafafc",
    "--lew-color-button-primary-fill-text-active": "#fafafc",
    "--lew-color-button-primary-light": p.light,
    "--lew-color-button-primary-light-hover": p.lightHover,
    "--lew-color-button-primary-light-active": p.lightActive,
    "--lew-color-button-primary-light-text": p.lightText,
    "--lew-color-button-primary-light-text-hover": p.lightTextHover,
    "--lew-color-button-primary-light-text-active": p.lightTextActive,
    "--lew-color-button-primary-ghost-text": p.ghostText,
    "--lew-color-button-primary-ghost-text-hover": p.ghostTextHover,
    "--lew-color-button-primary-ghost-text-active": p.ghostTextActive,
    "--lew-color-button-primary-text-text": p.textText,
    "--lew-color-button-primary-text-text-hover": p.textTextHover,
    "--lew-color-button-primary-text-text-active": p.textTextActive,
  };
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/** 覆盖 lew-ui 圆角变量 */
function applyRadius(level: RadiusLevel) {
  const root = document.documentElement;
  const r = RADIUS_MAP[level];
  root.style.setProperty("--lew-border-radius-mini", r.mini);
  root.style.setProperty("--lew-border-radius-small", r.small);
  root.style.setProperty("--lew-border-radius-medium", r.medium);
  root.style.setProperty("--lew-border-radius-large", r.large);
  // 应用自定义圆角变量（供布局使用）
  root.style.setProperty("--app-radius", r.medium);
}

export const useSettingsStore = defineStore("settings", () => {
  const isDark = useDark({
    selector: "html",
    attribute: "class",
    valueDark: "lew-dark",
    valueLight: "",
    storageKey: DARK_FLAG_KEY,
  });
  const toggleDark = useToggle(isDark);

  const mode = ref<ColorMode>((localStorage.getItem(MODE_KEY) as ColorMode | null) ?? "auto");
  const primaryColor = ref<string>(localStorage.getItem(PRIMARY_KEY) ?? THEME_COLORS[0]!.value);
  const radius = ref<RadiusLevel>(
    (localStorage.getItem(RADIUS_KEY) as RadiusLevel | null) ?? "round",
  );

  const collapsed = ref(false);

  function setMode(value: ColorMode) {
    mode.value = value;
    localStorage.setItem(MODE_KEY, value);
    if (value === "dark") toggleDark(true);
    else if (value === "light") toggleDark(false);
    else toggleDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  function setPrimaryColor(color: string) {
    primaryColor.value = color;
    localStorage.setItem(PRIMARY_KEY, color);
    applyPrimaryColor(color);
  }

  function setRadius(value: RadiusLevel) {
    radius.value = value;
    localStorage.setItem(RADIUS_KEY, value);
    applyRadius(value);
  }

  function toggleCollapsed() {
    collapsed.value = !collapsed.value;
  }

  /** 恢复默认主题配置 */
  function resetTheme() {
    setMode("auto");
    setPrimaryColor(THEME_COLORS[0]!.value);
    setRadius("round");
  }

  // 初始化时应用主题色与圆角
  watch(primaryColor, (color) => applyPrimaryColor(color), { immediate: true });
  watch(radius, (level) => applyRadius(level), { immediate: true });

  return {
    isDark,
    mode,
    primaryColor,
    radius,
    collapsed,
    setMode,
    setPrimaryColor,
    setRadius,
    toggleCollapsed,
    resetTheme,
  };
});
