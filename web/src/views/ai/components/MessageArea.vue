<script setup lang="ts">
import { computed } from "vue";
import { CircleAlert, CircleCheck, CircleX, Sparkles } from "lucide-vue-next";
import type { AiApprovalRequired, AiMessage, AiToolCall } from "~/types/api";
import { approvalResultOf, isPlainOutcome } from "../utils/display";
import ApprovalPanel from "./ApprovalPanel.vue";
import MarkdownContent from "./MarkdownContent.vue";
import ToolStepCard from "./ToolStepCard.vue";

const props = defineProps<{
  messages: AiMessage[];
  thinking: boolean;
  /** 当前等待确认的操作（内嵌在对应消息底部展示） */
  pendingApproval: AiApprovalRequired | null;
  /** 确认/取消按钮处理中 */
  approving: "confirm" | "cancel" | null;
}>();

const emit = defineEmits<{
  /** 确认当前待审批操作 */
  (e: "confirm"): void;
  /** 取消当前待审批操作 */
  (e: "cancel"): void;
}>();

/** 判断消息是否为「正在生成中」 */
function isFresh(message: AiMessage): boolean {
  return !!message._fresh;
}

/** 根据 tool 调用推断步骤状态 */
function toolStatus(call: AiToolCall): "running" | "success" | "approval" | "error" | "cancelled" {
  if (call.result === undefined) return "running";
  const status = (call.result as { status?: string })?.status;
  if (status === "waiting_approval") return "approval";
  if (status === "error") return "error";
  if (status === "cancelled") return "cancelled";
  return "success";
}

/** 消息中是否含有「等待审批」的步骤 */
function hasWaitingApproval(message: AiMessage): boolean {
  return !!message.toolCalls?.some((c) => toolStatus(c) === "approval");
}

/** 找到携带「等待审批」步骤的消息（内嵌确认条挂载于此） */
const approvalMessageId = computed<number | null>(() => {
  const list = props.messages;
  for (let i = list.length - 1; i >= 0; i--) {
    const msg = list[i]!;
    if (
      msg.role === "assistant" &&
      msg.toolCalls?.some(
        (c) => (c.result as { status?: string } | undefined)?.status === "waiting_approval",
      )
    ) {
      return msg.id;
    }
  }
  return null;
});

/** 审批结果标题文案 */
function outcomeLabel(outcome: "success" | "cancelled" | "error"): string {
  if (outcome === "success") return "操作已执行完成";
  if (outcome === "cancelled") return "操作已取消";
  return "操作执行失败";
}

/** 审批结果消息：正文为后端兜底短句时隐藏正文（结果条标题已表达） */
function shouldShowContent(message: AiMessage): boolean {
  if (!message.content) return false;
  const meta = approvalResultOf(message);
  return !(meta && isPlainOutcome(message.content));
}
</script>

<template>
  <div id="ai-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
    <!-- 空态引导 -->
    <div
      v-if="!messages.length && !thinking"
      class="flex flex-col items-center justify-center h-full text-center"
    >
      <Sparkles :size="40" class="text-[var(--lew-color-primary)] mb-3" />
      <div class="text-15px font-600 mb-1">AI 操作助手</div>
      <div class="text-13px text-[var(--app-text-muted)] max-w-80">
        用自然语言操作系统，例如「查询最近注册的用户」
      </div>
    </div>

    <!-- 消息列表 -->
    <div
      v-for="message in messages"
      :key="message.id"
      class="flex"
      :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
    >
      <div class="max-w-[78%] min-w-0">
        <!-- 用户消息气泡 -->
        <div
          v-if="message.role === 'user'"
          class="px-3.5 py-2.5 rounded-lg text-14px leading-relaxed whitespace-pre-wrap bg-[var(--lew-color-primary)] text-white"
        >
          {{ message.content }}
        </div>

        <!-- assistant 消息 -->
        <template v-else-if="message.role === 'assistant'">
          <!-- 审批结果条：图标 + 状态标题（读持久化 toolResults 元数据，刷新后一致） -->
          <div
            v-if="approvalResultOf(message)"
            class="flex items-center gap-1.5 px-3.5 pt-2.5"
            :class="
              approvalResultOf(message)?.outcome === 'success'
                ? 'text-green-600'
                : approvalResultOf(message)?.outcome === 'cancelled'
                  ? 'text-[var(--app-text-muted)]'
                  : 'text-red-500'
            "
          >
            <CircleCheck
              v-if="approvalResultOf(message)?.outcome === 'success'"
              :size="18"
              class="shrink-0"
            />
            <CircleX
              v-else-if="approvalResultOf(message)?.outcome === 'cancelled'"
              :size="18"
              class="shrink-0"
            />
            <CircleAlert v-else :size="18" class="shrink-0" />
            <span class="text-14px font-600">
              {{ outcomeLabel(approvalResultOf(message)?.outcome ?? "success") }}
            </span>
          </div>

          <!-- 生成中占位：tool 步骤可能先到、文本未到时显示光标 -->
          <div
            v-if="isFresh(message) && !message.content"
            class="flex items-center gap-1.5 text-13px text-[var(--app-text-muted)] px-1 py-0.5"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span v-if="hasWaitingApproval(message)"> 等待你的确认... </span>
            <span v-else-if="message.toolCalls?.length">正在处理...</span>
            <span v-else>AI 正在分析...</span>
          </div>

          <!-- 文本内容：真流式（后端增量推送）→ 实时渲染 Markdown -->
          <div
            v-if="shouldShowContent(message)"
            class="px-3.5 py-2.5 rounded-lg text-14px leading-relaxed"
          >
            <MarkdownContent :content="message.content ?? ''" />
          </div>

          <!-- 操作步骤（tool 调用）：折叠卡片，默认闭合 -->
          <div v-if="message.toolCalls?.length" class="mt-2 space-y-1.5">
            <ToolStepCard
              v-for="(call, index) in message.toolCalls"
              :key="`${message.id}-${index}`"
              :name="call.name"
              :args="call.arguments"
              :result="call.result"
              :status="toolStatus(call)"
            />
          </div>

          <!-- 待审批操作：内嵌确认条（替代弹窗/悬浮提示），置于消息底部 -->
          <ApprovalPanel
            v-if="pendingApproval && message.id === approvalMessageId"
            :approval="pendingApproval"
            :loading="approving"
            class="mt-2"
            @confirm="$emit('confirm')"
            @cancel="$emit('cancel')"
          />
        </template>
      </div>
    </div>

    <!-- 思考中（历史无消息且正在请求时的兜底提示） -->
    <div v-if="thinking && !messages.some(isFresh)" class="flex justify-start">
      <div
        class="px-3.5 py-2.5 rounded-lg bg-[var(--app-bg-hover)] text-13px text-[var(--app-text-muted)]"
      >
        <span class="inline-flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          AI 正在分析...
        </span>
      </div>
    </div>
  </div>
</template>
