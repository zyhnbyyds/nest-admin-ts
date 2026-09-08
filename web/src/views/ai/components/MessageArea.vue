<script setup lang="ts">
import { ref } from "vue";
import { ShieldCheck, Sparkles } from "lucide-vue-next";
import { LewAlert, LewButton, LewTag } from "lew-ui";
import type { AiApprovalRequired, AiMessage, AiToolCall } from "~/types/api";
import { riskColor, riskText } from "../utils/display";
import MarkdownContent from "./MarkdownContent.vue";
import ToolStepCard from "./ToolStepCard.vue";
import TypewriterText from "./TypewriterText.vue";

defineProps<{
  messages: AiMessage[];
  thinking: boolean;
  pendingApproval: AiApprovalRequired | null;
  confirming: boolean;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "reject"): void;
  /** 生成中的消息已完整打完字，父级将其标记为完成 */
  (e: "typed", messageId: number): void;
}>();

const listEl = ref<HTMLElement | null>(null);

/** 判断消息是否为「正在生成中」 */
function isFresh(message: AiMessage): boolean {
  return !!message._fresh;
}

/** 根据 tool 调用推断步骤状态 */
function toolStatus(call: AiToolCall): "running" | "success" | "approval" | "error" {
  if (call.result === undefined) return "running";
  const status = (call.result as { status?: string })?.status;
  if (status === "waiting_approval") return "approval";
  if (status === "error") return "error";
  return "success";
}

/** 滚动到底部（打字机播放中跟随） */
function scrollToBottom() {
  const el = listEl.value;
  if (el) el.scrollTop = el.scrollHeight;
}
</script>

<template>
  <div ref="listEl" id="ai-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
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
          class="px-3.5 py-2.5 rounded-lg text-13.5px leading-relaxed whitespace-pre-wrap bg-[var(--lew-color-primary)] text-white"
        >
          {{ message.content }}
        </div>

        <!-- assistant 消息 -->
        <template v-else-if="message.role === 'assistant'">
          <!-- 生成中占位：tool 步骤可能先到、文本未到时显示光标 -->
          <div
            v-if="isFresh(message) && !message.content"
            class="flex items-center gap-1.5 text-12.5px text-[var(--app-text-muted)] px-1 py-0.5"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span v-if="message.toolCalls?.length">正在处理...</span>
            <span v-else>AI 正在分析...</span>
          </div>

          <!-- 文本内容：生成中用打字机，否则 markdown 直接渲染 -->
          <div
            v-if="message.content"
            class="px-3.5 py-2.5 rounded-lg text-13.5px leading-relaxed bg-[var(--app-bg-hover)]"
          >
            <TypewriterText
              v-if="isFresh(message)"
              :text="message.content"
              :active="true"
              @done="emit('typed', message.id)"
              @scroll="scrollToBottom"
            />
            <MarkdownContent v-else :content="message.content" />
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
        </template>
      </div>
    </div>

    <!-- 确认操作卡片 -->
    <div v-if="pendingApproval" class="flex justify-center">
      <div class="w-full max-w-lg">
        <LewAlert type="warning" title="需要确认操作" :closable="false" class="mb-3">
          <template #default>
            <div class="flex items-center gap-2 mt-1">
              <LewTag :type="'light'" :color="riskColor(pendingApproval.riskLevel)" size="small">
                {{ riskText(pendingApproval.riskLevel) }}
              </LewTag>
              <span class="text-12.5px text-[var(--app-text-muted)]">
                工具：{{ pendingApproval.toolName }}
              </span>
            </div>
            <div v-if="pendingApproval.preview" class="mt-2">
              <div class="text-12px text-[var(--app-text-muted)] mb-1">操作预览</div>
              <div class="text-13px font-500">{{ pendingApproval.preview.summary }}</div>
              <div class="text-12px text-[var(--app-text-muted)] mt-1">
                影响数量：{{ pendingApproval.preview.affectedCount }}
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-3">
              <LewButton size="small" :disabled="confirming" @click="emit('reject')">
                取消
              </LewButton>
              <LewButton type="fill" size="small" :loading="confirming" @click="emit('confirm')">
                <template #icon><ShieldCheck :size="14" /></template>
                确认执行
              </LewButton>
            </div>
          </template>
        </LewAlert>
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
