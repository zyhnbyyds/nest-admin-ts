<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next';
import { LewButton, LewTag } from 'lew-ui';
import type { AiApprovalRequired } from '~/types/api';
import { riskColor, riskText } from '../utils/display';

defineProps<{
  /** 待确认的操作信息 */
  approval: AiApprovalRequired;
  /** 当前处理中的动作（confirm/cancel），用于按钮 loading 与互斥 */
  loading: 'confirm' | 'cancel' | null;
}>();

defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <div
    class="rounded-lg border border-orange-500/40 bg-[var(--app-bg-card)] overflow-hidden"
  >
    <div class="flex items-center gap-2 px-3 pt-2.5">
      <ShieldAlert :size="15" class="shrink-0 text-orange-500" />
      <span class="text-13px font-600 text-[var(--app-text-primary)]"
        >需要你确认该操作</span
      >
      <LewTag
        :type="'light'"
        :color="riskColor(approval.riskLevel)"
        size="small"
        class="shrink-0"
      >
        {{ riskText(approval.riskLevel) }}
      </LewTag>
      <span
        class="ml-auto min-w-0 truncate text-12px font-mono text-[var(--app-text-muted)]"
      >
        {{ approval.toolName }}
      </span>
    </div>

    <!-- 操作预览 -->
    <div v-if="approval.preview" class="px-3 pt-2">
      <div class="rounded-md bg-[var(--app-bg-hover)] px-2.5 py-2">
        <div
          class="text-12.5px leading-relaxed text-[var(--app-text-primary)] break-all"
        >
          {{ approval.preview.summary }}
        </div>
        <div class="mt-1 text-11.5px text-[var(--app-text-muted)]">
          影响数量：{{ approval.preview.affectedCount }}
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-end gap-2 px-3 py-2.5">
      <LewButton
        type="light"
        size="small"
        :loading="loading === 'cancel'"
        :disabled="loading !== null"
        @click="$emit('cancel')"
      >
        取消
      </LewButton>
      <LewButton
        type="fill"
        size="small"
        :loading="loading === 'confirm'"
        :disabled="loading !== null"
        @click="$emit('confirm')"
      >
        确认执行
      </LewButton>
    </div>
  </div>
</template>
