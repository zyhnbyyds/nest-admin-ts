<script setup lang="ts">
import { Send } from "lucide-vue-next";
import { LewButton, LewTextarea } from "lew-ui";

defineProps<{
  modelValue: string;
  sending: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "send"): void;
}>();

function onKeydown(event: KeyboardEvent) {
  // Enter 发送，Shift+Enter 换行
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    emit("send");
  }
}
</script>

<template>
  <div class="p-3 border-t border-[var(--app-border)]">
    <div class="flex items-end gap-2">
      <LewTextarea
        :model-value="modelValue"
        :rows="2"
        :max-length="2000"
        placeholder="输入你的指令，例如：查询最近注册的用户（Enter 发送，Shift+Enter 换行）"
        class="flex-1"
        @update:model-value="emit('update:modelValue', $event)"
        @keydown="onKeydown"
      />
      <LewButton
        type="fill"
        :disabled="disabled || sending || !modelValue.trim()"
        @click="emit('send')"
      >
        <template #icon><Send :size="14" /></template>
        发送
      </LewButton>
    </div>
  </div>
</template>
