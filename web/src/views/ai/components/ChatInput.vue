<script setup lang="ts">
import { Loader2, Send } from 'lucide-vue-next';
import { LewTextarea } from 'lew-ui';

defineProps<{
  modelValue: string;
  sending: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'send'): void;
}>();

function onKeydown(event: KeyboardEvent) {
  // Enter 发送，Shift+Enter 换行
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    emit('send');
  }
}
</script>

<template>
  <div class="chat-input p-3 border-t border-[var(--app-border)]">
    <div class="relative">
      <LewTextarea
        :model-value="modelValue"
        :rows="2"
        :max-length="2000"
        placeholder="输入你的指令，例如：查询最近注册的用户（Enter 发送，Shift+Enter 换行）"
        class="w-full"
        @update:model-value="emit('update:modelValue', $event)"
        @keydown="onKeydown"
      />
      <button
        type="button"
        class="absolute right-2.5 bottom-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all bg-[var(--lew-color-primary)] hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="disabled || sending || !modelValue.trim()"
        :title="sending ? '正在发送...' : '发送（Enter）'"
        aria-label="发送"
        @click="emit('send')"
      >
        <Loader2 v-if="sending" :size="15" class="animate-spin" />
        <Send v-else :size="15" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 内嵌右下发送按钮：给输入文字在右下角让出空间，避免被按钮遮挡 */
.chat-input :deep(textarea.lew-textarea) {
  padding-right: 3rem;
}
</style>
