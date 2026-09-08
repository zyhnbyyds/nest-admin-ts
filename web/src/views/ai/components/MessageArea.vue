<script setup lang="ts">
import { Database, ShieldCheck, Sparkles } from "lucide-vue-next";
import { LewAlert, LewButton, LewTag } from "lew-ui";
import type { AiApprovalRequired, AiMessage } from "~/types/api";
import {
  USER_TABLE_COLUMNS,
  formatArgs,
  hasMarkdownTable,
  isStatusColumn,
  isUserList,
  renderAssistantContent,
  riskColor,
  riskText,
  userCellValue,
} from "../utils/display";

defineProps<{
  messages: AiMessage[];
  thinking: boolean;
  pendingApproval: AiApprovalRequired | null;
  confirming: boolean;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "reject"): void;
}>();
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
      <div class="max-w-[78%]">
        <!-- 文本气泡 -->
        <div
          v-if="message.content"
          class="px-3.5 py-2.5 rounded-lg text-13.5px leading-relaxed whitespace-pre-wrap"
          :class="
            message.role === 'user'
              ? 'bg-[var(--lew-color-primary)] text-white'
              : 'bg-[var(--app-bg-hover)]'
          "
        >
          <template v-if="message.role === 'assistant' && hasMarkdownTable(message.content)">
            <div v-html="renderAssistantContent(message.content)"></div>
          </template>
          <template v-else>{{ message.content }}</template>
        </div>

        <!-- Tool 调用卡片 -->
        <div
          v-if="message.role === 'assistant' && message.toolCalls?.length"
          class="mt-2 space-y-2"
        >
          <div
            v-for="(call, index) in message.toolCalls"
            :key="index"
            class="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] overflow-hidden"
          >
            <div class="flex items-center gap-1.5 px-3 py-2 bg-[var(--app-bg-hover)]">
              <Database :size="13" class="text-[var(--lew-color-primary)]" />
              <span class="text-12.5px font-600">{{ call.name }}</span>
              <span class="text-11px text-[var(--app-text-muted)] ml-auto truncate">
                {{ formatArgs(call.arguments) }}
              </span>
            </div>
            <!-- 结果展示 -->
            <div v-if="call.result" class="px-3 py-2">
              <template v-if="isUserList(call.result)">
                <div class="text-11.5px text-[var(--app-text-muted)] mb-1.5">
                  查询到
                  <span class="font-600 text-[var(--lew-color-primary)]">
                    {{ (call.result as { items: unknown[] }).items.length }}
                  </span>
                  条用户记录
                </div>
                <div class="overflow-x-auto rounded-md border border-[var(--app-border)]">
                  <table class="w-full text-12px">
                    <thead>
                      <tr class="bg-[var(--app-bg-hover)]">
                        <th
                          v-for="col in USER_TABLE_COLUMNS"
                          :key="col.key"
                          class="px-2.5 py-2 text-left font-600 text-[var(--app-text-primary)] whitespace-nowrap"
                        >
                          {{ col.label }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(user, i) in (
                          call.result as { items: Array<Record<string, unknown>> }
                        ).items"
                        :key="i"
                        class="border-t border-[var(--app-border)] transition-colors hover:bg-[var(--app-bg-hover)]"
                      >
                        <td
                          v-for="col in USER_TABLE_COLUMNS"
                          :key="col.key"
                          class="px-2.5 py-2 whitespace-nowrap text-[var(--app-text-primary)]"
                        >
                          <template v-if="isStatusColumn(col.key)">
                            <LewTag
                              :type="'light'"
                              :color="user.status === 'active' ? 'success' : 'warning'"
                              size="small"
                            >
                              {{ user.status === "active" ? "启用" : "禁用" }}
                            </LewTag>
                          </template>
                          <template v-else>
                            <span :class="col.key === 'id' ? 'text-[var(--app-text-muted)]' : ''">
                              {{ userCellValue(user, col.key) }}
                            </span>
                          </template>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
              <!-- 其他结果 -->
              <pre
                v-else
                class="text-11.5px text-[var(--app-text-muted)] whitespace-pre-wrap break-all max-h-32 overflow-y-auto"
                >{{ JSON.stringify(call.result, null, 2) }}</pre>
            </div>
          </div>
        </div>
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

    <!-- 思考中 -->
    <div v-if="thinking" class="flex justify-start">
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
