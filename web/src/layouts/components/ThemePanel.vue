<script setup lang="ts">
import { computed } from "vue";
import { LewColorPicker, LewDrawer, LewMessage, LewTabs } from "lew-ui";
import type { LewTabsOption } from "lew-ui";
import { RotateCcw } from "lucide-vue-next";
import { RADIUS_LEVELS, THEME_COLORS, useSettingsStore } from "~/store/settings";
import type { ColorMode, RadiusLevel } from "~/types/app";

const visible = defineModel<boolean>("visible", { default: false });
const settings = useSettingsStore();

const modeOptions: LewTabsOption[] = [
  { label: "浅色", value: "light" },
  { label: "深色", value: "dark" },
  { label: "跟随系统", value: "auto" },
];

const radiusOptions: LewTabsOption[] = RADIUS_LEVELS.map((r) => ({
  label: r.label,
  value: r.value,
}));

/** 当前主色是否来自预设色板（用于高亮） */
const isPreset = computed(() =>
  THEME_COLORS.some((c) => c.value.toLowerCase() === settings.primaryColor.toLowerCase()),
);

/** 外观模式双向绑定（v-model 驱动 setMode 持久化） */
const modeModel = computed({
  get: () => settings.mode,
  set: (value: string) => settings.setMode(value as ColorMode),
});

/** 圆角双向绑定 */
const radiusModel = computed({
  get: () => settings.radius,
  set: (value: string) => settings.setRadius(value as RadiusLevel),
});

function handleReset() {
  settings.resetTheme();
  LewMessage.success("已恢复默认主题");
}
</script>

<template>
  <LewDrawer
    closeOnClickOverlay
    closeByEsc
    hideFooter
    v-model:visible="visible"
    title="主题设置"
    width="360px"
  >
    <div class="p-5">
      <!-- 外观模式 -->
      <section class="mb-6">
        <h4 class="m-0 mb-3 text-13px font-600 text-[var(--app-text-secondary)]">外观模式</h4>
        <LewTabs
          class="inline-block"
          v-model="modeModel"
          :options="modeOptions"
          type="block"
          round
        />
      </section>

      <!-- 主题色 -->
      <section class="mb-6">
        <h4 class="m-0 mb-3 text-13px font-600 text-[var(--app-text-secondary)]">主题色</h4>
        <!-- 圆形 tabs 色板 -->
        <div class="flex items-center gap-2.5">
          <button
            v-for="color in THEME_COLORS"
            :key="color.value"
            class="relative w-30px h-30px rounded-full cursor-pointer transition-all duration-200 hover:scale-112"
            :style="{ background: color.value }"
            :class="
              settings.primaryColor.toLowerCase() === color.value.toLowerCase()
                ? 'ring-2 ring-[var(--lew-color-primary)] ring-offset-2 ring-offset-[var(--app-bg-card)] scale-112'
                : 'ring-1 ring-[var(--app-border)]'
            "
            :title="color.label"
            @click="settings.setPrimaryColor(color.value)"
          ></button>
          <!-- 自定义取色器 -->
          <LewColorPicker
            :model-value="settings.primaryColor"
            width="30px"
            size="small"
            class="!w-30px !h-30px"
            @change="(v?: string) => v && settings.setPrimaryColor(v)"
          />
        </div>
        <p class="m-0 mt-2.5 text-12px text-[var(--app-text-muted)]">
          当前色值：<span class="font-mono">{{ settings.primaryColor }}</span>
          <template v-if="!isPreset">（自定义）</template>
        </p>
      </section>

      <!-- 圆角 -->
      <section class="mb-6">
        <h4 class="m-0 mb-3 text-13px font-600 text-[var(--app-text-secondary)]">圆角风格</h4>
        <LewTabs v-model="radiusModel" :options="radiusOptions" type="block" round />
      </section>

      <!-- 重置 -->
      <button
        class="w-full flex items-center justify-center gap-1.5 py-2 border rounded-8px text-13px cursor-pointer transition-colors duration-200 border-[var(--app-border)] text-[var(--app-text-secondary)] hover:border-[var(--lew-color-primary)] hover:text-[var(--lew-color-primary)]"
        @click="handleReset"
      >
        <RotateCcw :size="14" />
        恢复默认主题
      </button>
    </div>
  </LewDrawer>
</template>
