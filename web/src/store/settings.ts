import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useDark, useToggle } from "@vueuse/core";
import type { ColorMode } from "~/types/app";

const MODE_KEY = "nest-admin:color-mode";
const PRIMARY_KEY = "nest-admin:primary-color";

/** 可选主题色（与 lew-ui 色板对齐） */
export const THEME_COLORS: { label: string; value: string }[] = [
  { label: "蓝", value: "#78a8ff" },
  { label: "绿", value: "#62c68c" },
  { label: "红", value: "#ff7875" },
  { label: "橙", value: "#ffa940" },
  { label: "紫", value: "#b37feb" },
  { label: "青", value: "#5cdbd3" },
];

function applyPrimaryColor(color: string) {
  const root = document.documentElement;
  // 覆盖 lew-ui primary 色系变量（浅色/深色共用同一入口，由 .lew-dark 提供底色阶）
  root.style.setProperty("--lew-color-primary", color);
  root.style.setProperty("--lew-color-primary-hover", color);
  root.style.setProperty("--lew-color-primary-active", color);
  root.style.setProperty("--lew-color-button-primary-fill", color);
  root.style.setProperty("--lew-color-button-primary-fill-hover", color);
  root.style.setProperty("--lew-color-button-primary-fill-active", color);
}

export const useSettingsStore = defineStore("settings", () => {
  const isDark = useDark({
    selector: "html",
    attribute: "class",
    valueDark: "lew-dark",
    valueLight: "",
    storageKey: MODE_KEY,
  });
  const toggleDark = useToggle(isDark);

  const mode = ref<ColorMode>((localStorage.getItem(MODE_KEY) as ColorMode | null) ?? "auto");
  const primaryColor = ref<string>(localStorage.getItem(PRIMARY_KEY) ?? THEME_COLORS[0]!.value);

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

  function toggleCollapsed() {
    collapsed.value = !collapsed.value;
  }

  // 初始化时应用主题色
  watch(primaryColor, (color) => applyPrimaryColor(color), { immediate: true });

  return {
    isDark,
    mode,
    primaryColor,
    collapsed,
    setMode,
    setPrimaryColor,
    toggleCollapsed,
  };
});
