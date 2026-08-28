<script setup lang="ts">
import { LewDrawer } from "lew-ui";
import { THEME_COLORS, useSettingsStore } from "~/store/settings";
import type { ColorMode } from "~/types/app";

const visible = defineModel<boolean>("visible", { default: false });
const settings = useSettingsStore();

const modes: { label: string; value: ColorMode }[] = [
  { label: "浅色", value: "light" },
  { label: "深色", value: "dark" },
  { label: "跟随系统", value: "auto" },
];
</script>

<template>
  <LewDrawer v-model:visible="visible" title="主题设置" width="360px">
    <div class="py-1">
      <!-- 模式 -->
      <section class="mb-6">
        <h4 class="m-0 mb-3 text-13px font-600 text-[var(--app-text-secondary)]">外观模式</h4>
        <div class="flex gap-2">
          <button
            v-for="mode in modes"
            :key="mode.value"
            class="flex-1 py-2 border rounded-8px bg-[var(--app-bg-card)] text-[var(--app-text-secondary)] text-13px cursor-pointer transition-all duration-200 hover:border-[var(--lew-color-primary)]"
            :class="
              settings.mode === mode.value
                ? 'border-[var(--lew-color-primary)] bg-[var(--lew-color-primary-light)] text-[var(--lew-color-primary)] font-600'
                : 'border-[var(--app-border)]'
            "
            @click="settings.setMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
      </section>

      <!-- 主题色 -->
      <section class="mb-6">
        <h4 class="m-0 mb-3 text-13px font-600 text-[var(--app-text-secondary)]">主题色</h4>
        <div class="flex gap-2.5">
          <button
            v-for="color in THEME_COLORS"
            :key="color.value"
            class="w-28px h-28px border-2 rounded-full cursor-pointer transition-all duration-200 hover:scale-1.12"
            :style="{ background: color.value }"
            :class="
              settings.primaryColor === color.value
                ? 'border-[var(--app-text-primary)] scale-1.12'
                : 'border-transparent'
            "
            :title="color.label"
            @click="settings.setPrimaryColor(color.value)"
          />
        </div>
      </section>
    </div>
  </LewDrawer>
</template>
