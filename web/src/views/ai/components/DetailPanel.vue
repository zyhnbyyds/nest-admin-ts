<script setup lang="ts">
import { computed } from "vue";
import {
  Check,
  Clock,
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

const props = defineProps<{
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

/** 任务历史：最近 5 条（按 id 降序，最新在前） */
const recentTasks = computed(() => [...props.taskHistory].sort((a, b) => b.id - a.id).slice(0, 5));

const emit = defineEmits<{
  (e: "toggle"): void;
  (e: "rollback", taskId: number): void;
}>();

// ---------- 状态口径（与消息区 ToolStepCard 保持一致，保证返显一致） ----------

type CallStatus = "running" | "waiting" | "success" | "cancelled" | "error";

function callStatus(call: AiToolCall): CallStatus {
  if (call.result === undefined) return "running";
  const status = (call.result as { status?: string })?.status;
  if (status === "waiting_approval") return "waiting";
  if (status === "cancelled") return "cancelled";
  if (status === "error") return "error";
  return "success";
}

function callStatusText(call: AiToolCall): string {
  const s = callStatus(call);
  if (s === "running") return "执行中...";
  if (s === "waiting") return "等待确认";
  if (s === "cancelled") return "已取消";
  if (s === "error") return "执行失败";
  return isUserList(call.result)
    ? `返回 ${(call.result as { items: unknown[] }).items.length} 条`
    : "已执行";
}

function callStatusClass(s: CallStatus): string {
  if (s === "running") return "text-[var(--lew-color-primary)]";
  if (s === "waiting") return "text-orange-500";
  if (s === "cancelled") return "text-[var(--app-text-muted)]";
  if (s === "error") return "text-red-500";
  return "text-green-500";
}

/** 任务步骤圆点颜色（覆盖 SKIPPED / WAITING_APPROVAL / CANCELLED） */
function stepDot(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: "bg-green-500",
    FAILED: "bg-red-500",
    RUNNING: "bg-orange-500",
    PENDING: "bg-[var(--app-border)]",
    SKIPPED: "bg-[var(--app-border)]",
    CANCELLED: "bg-[var(--app-border)]",
    WAITING_APPROVAL: "bg-orange-500",
  };
  return map[status] ?? "bg-[var(--app-border)]";
}
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
                  {{ waitingApproval ? "等待确认" : "无待确认" }}
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
                  <Database :size="13" class="shrink-0 text-[var(--lew-color-primary)]" />
                  <span class="font-600 text-[var(--lew-color-primary)]">{{ call.name }}</span>
                  <Loader2
                    v-if="callStatus(call) === 'running'"
                    :size="12"
                    class="shrink-0 text-[var(--lew-color-primary)] animate-spin"
                  />
                  <Clock
                    v-else-if="callStatus(call) === 'waiting'"
                    :size="12"
                    class="shrink-0 text-orange-500"
                  />
                  <X
                    v-else-if="callStatus(call) === 'cancelled'"
                    :size="12"
                    class="shrink-0 text-[var(--app-text-muted)]"
                  />
                  <X
                    v-else-if="callStatus(call) === 'error'"
                    :size="12"
                    class="shrink-0 text-red-500"
                  />
                  <Check v-else :size="12" class="shrink-0 text-green-500" />
                </div>
                <div class="text-[var(--app-text-muted)] mt-1 break-all">
                  {{ formatArgs(call.arguments) }}
                </div>
                <div class="mt-1 text-11px" :class="callStatusClass(callStatus(call))">
                  {{ callStatusText(call) }}
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
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="stepDot(step.status)" />
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
            <div v-if="recentTasks.length" class="space-y-2 p-1">
              <div
                v-for="task in recentTasks"
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
