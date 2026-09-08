<script setup lang="ts">
import {
  Database,
  Loader2,
  PanelRight,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-vue-next";
import { LewButton, LewCollapse, LewCollapseItem, LewTag } from "lew-ui";
import { formatDateTime } from "~/composables/useFormat";
import type { AiTaskInfo, AiTaskStep, AiToolCall } from "~/types/api";
import { formatArgs, isUserList, riskColor, riskText, stepColor, stepText } from "../utils/display";

defineProps<{
  collapsed: boolean;
  riskLevel: string;
  waitingApproval: boolean;
  toolCalls: AiToolCall[];
  currentTaskId: number | null;
  taskSteps: AiTaskStep[];
  taskStatus: string;
  rollbacking: boolean;
  taskHistory: AiTaskInfo[];
}>();

const emit = defineEmits<{
  (e: "toggle"): void;
  (e: "rollback", taskId: number): void;
}>();
</script>

<template>
  <aside
    class="flex flex-col shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] overflow-hidden transition-[width] duration-200"
    :style="{ width: collapsed ? '40px' : '288px' }"
  >
    <!-- 折叠态：窄条 -->
    <div v-if="collapsed" class="flex flex-col items-center py-3 gap-3 h-full">
      <div
        class="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)] hover:text-[var(--app-text-primary)]"
        title="展开操作详情"
        @click="emit('toggle')"
      >
        <PanelRight :size="16" />
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <div class="w-1.5 h-1.5 rounded-full bg-[var(--app-border)]" />
        <div class="w-1.5 h-1.5 rounded-full bg-[var(--app-border)]" />
        <div class="w-1.5 h-1.5 rounded-full bg-[var(--app-border)]" />
      </div>
    </div>

    <!-- 展开态：完整面板 -->
    <template v-else>
      <div class="flex items-center justify-between px-3 py-3 border-b border-[var(--app-border)]">
        <span class="text-14px font-600">操作详情</span>
        <button
          class="flex items-center justify-center w-6 h-6 rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)] hover:text-[var(--app-text-primary)]"
          @click="emit('toggle')"
        >
          <X :size="15" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <LewCollapse :width="'100%'">
          <!-- 风险与审批 -->
          <LewCollapseItem collapse-key="risk" title="风险与审批" :radius="'8px'">
            <div class="space-y-3 p-1">
              <div class="flex items-center gap-2">
                <ShieldCheck
                  v-if="!riskLevel || riskLevel === 'L0' || riskLevel === 'L1'"
                  :size="16"
                  class="text-green-500"
                />
                <ShieldAlert v-else :size="16" class="text-orange-500" />
                <LewTag :type="'light'" :color="riskColor(riskLevel || 'L0')" size="small">
                  {{ riskText(riskLevel || "L0") }}
                </LewTag>
              </div>
              <div class="border-t border-[var(--app-border)] pt-2">
                <div class="text-12px text-[var(--app-text-muted)] mb-1.5">审批状态</div>
                <LewTag
                  :type="'light'"
                  :color="waitingApproval ? 'warning' : 'success'"
                  size="small"
                >
                  {{ waitingApproval ? "等待确认" : "自动执行" }}
                </LewTag>
              </div>
            </div>
          </LewCollapseItem>

          <!-- Tool 调用 -->
          <LewCollapseItem collapse-key="tools" title="Tool 调用" :radius="'8px'">
            <div v-if="toolCalls.length" class="space-y-2 p-1">
              <div
                v-for="(call, index) in toolCalls"
                :key="index"
                class="text-12.5px rounded-md border border-[var(--app-border)] p-2"
              >
                <div class="flex items-center gap-1.5">
                  <Loader2
                    v-if="call.result === undefined"
                    :size="12"
                    class="shrink-0 text-[var(--lew-color-primary)] animate-spin"
                  />
                  <Database :size="13" class="shrink-0 text-[var(--lew-color-primary)]" />
                  <span class="font-600 text-[var(--lew-color-primary)]">{{ call.name }}</span>
                </div>
                <div class="text-[var(--app-text-muted)] mt-1 break-all">
                  {{ formatArgs(call.arguments) }}
                </div>
                <div
                  v-if="call.result === undefined"
                  class="mt-1 text-11px text-[var(--lew-color-primary)]"
                >
                  执行中...
                </div>
                <div
                  v-else-if="call.result !== undefined"
                  class="mt-1 text-11px"
                  :class="
                    (call.result as { status?: string })?.status === 'waiting_approval'
                      ? 'text-orange-500'
                      : 'text-green-500'
                  "
                >
                  {{
                    (call.result as { status?: string })?.status === "waiting_approval"
                      ? "等待确认"
                      : isUserList(call.result)
                        ? `返回 ${(call.result as { items: unknown[] }).items.length} 条`
                        : "已执行"
                  }}
                </div>
              </div>
            </div>
            <div v-else class="text-12px text-[var(--app-text-muted)] p-1">暂无</div>
          </LewCollapseItem>

          <!-- 任务时间线 -->
          <LewCollapseItem
            v-if="currentTaskId"
            collapse-key="timeline"
            title="任务时间线"
            :radius="'8px'"
          >
            <div class="p-1">
              <div class="flex items-center justify-between mb-2">
                <span class="text-12px text-[var(--app-text-muted)]">#{{ currentTaskId }}</span>
                <LewTag :type="'light'" :color="stepColor(taskStatus || 'RUNNING')" size="small">
                  {{ stepText(taskStatus || "RUNNING") }}
                </LewTag>
              </div>
              <LewButton
                v-if="taskStatus === 'SUCCESS'"
                type="light"
                size="small"
                :loading="rollbacking"
                class="mb-2"
                @click="emit('rollback', currentTaskId)"
              >
                <template #icon><RotateCcw :size="12" /></template>
                撤销操作
              </LewButton>
              <div class="space-y-1.5">
                <div
                  v-for="step in [...taskSteps].sort((a, b) => a.stepIndex - b.stepIndex)"
                  :key="step.stepIndex"
                  class="flex items-center gap-2 text-12px"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="{
                      'bg-green-500': step.status === 'SUCCESS',
                      'bg-orange-500': step.status === 'RUNNING',
                      'bg-red-500': step.status === 'FAILED',
                      'bg-[var(--app-border)]': step.status === 'PENDING',
                    }"
                  />
                  <span class="text-[var(--app-text-muted)] font-mono">#{{ step.stepIndex }}</span>
                  <span class="truncate">{{ step.toolName }}</span>
                  <span class="ml-auto shrink-0 text-[var(--app-text-muted)]">
                    {{ stepText(step.status) }}
                  </span>
                </div>
              </div>
            </div>
          </LewCollapseItem>

          <!-- 任务历史 -->
          <LewCollapseItem collapse-key="history" title="任务历史" :radius="'8px'">
            <div v-if="taskHistory.length" class="space-y-2 p-1">
              <div
                v-for="task in taskHistory.slice(0, 5)"
                :key="task.id"
                class="text-12px rounded-md border border-[var(--app-border)] p-2"
              >
                <div class="flex items-center gap-1.5">
                  <span class="font-600 text-[var(--lew-color-primary)]">#{{ task.id }}</span>
                  <LewTag :type="'light'" :color="stepColor(task.status)" size="small">
                    {{ stepText(task.status) }}
                  </LewTag>
                  <button
                    v-if="task.status === 'SUCCESS'"
                    class="ml-auto flex items-center gap-0.5 text-[var(--app-text-muted)] hover:text-[var(--lew-color-primary)]"
                    :disabled="rollbacking"
                    title="撤销任务"
                    @click="emit('rollback', task.id)"
                  >
                    <RotateCcw :size="12" />
                  </button>
                </div>
                <div class="text-[var(--app-text-muted)] mt-1 truncate">{{ task.goal }}</div>
                <div class="text-11px text-[var(--app-text-muted)] mt-0.5">
                  {{ formatDateTime(task.completedAt ?? task.createdAt) }}
                </div>
              </div>
            </div>
            <div v-else class="text-12px text-[var(--app-text-muted)] p-1">暂无任务</div>
          </LewCollapseItem>
        </LewCollapse>
      </div>
    </template>
  </aside>
</template>
