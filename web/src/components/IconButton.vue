<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    /** 悬停提示（兼作无障碍名称） */
    title?: string;
    /** 图标颜色语义：primary 主题蓝、error 红色 */
    color?: "primary" | "error";
    /** 按钮级权限标识；无权限时按钮不渲染 */
    permission?: string | string[];
    disabled?: boolean;
  }>(),
  { color: "primary", disabled: false },
);

defineEmits<{ click: [event: MouseEvent] }>();

const colorClass = computed(() =>
  props.color === "error"
    ? "!text-[var(--lew-color-error)] hover:!text-[var(--lew-color-error)]"
    : "!text-[var(--lew-color-primary)] hover:!text-[var(--lew-color-primary-dark)]",
);
</script>

<template>
  <button
    v-permission="permission"
    type="button"
    class="icon-btn"
    :class="[colorClass, { 'disabled:cursor-not-allowed disabled:opacity-40': disabled }]"
    :title="title"
    :disabled="disabled"
    @click.stop="$emit('click', $event)"
  >
    <slot />
  </button>
</template>