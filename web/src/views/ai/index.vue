<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  Database,
  PanelRight,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-vue-next";
import { LewButton, LewMessage, LewTag } from "lew-ui";
import {
  confirmAction,
  createSession,
  listMessages,
  listSessions,
  listTasks,
  rejectAction,
  rollbackTask,
  sendMessage,
} from "~/api/ai";
import { formatDateTime } from "~/composables/useFormat";
import type {
  AiApprovalRequired,
  AiMessage,
  AiSession,
  AiSseEvent,
  AiTaskInfo,
  AiTaskStep,
  AiToolCall,
} from "~/types/api";

// ---------- 布局折叠状态 ----------
const leftCollapsed = ref(false);
const rightCollapsed = ref(true);
const leftWidth = computed(() => (leftCollapsed.value ? "48px" : "224px"));
const rightWidth = computed(() => (rightCollapsed.value ? "40px" : "288px"));

// ---------- 会话 ----------
const sessions = ref<AiSession[]>([]);
const currentSession = ref<AiSession | null>(null);
const messages = ref<AiMessage[]>([]);
const input = ref("");
const sending = ref(false);
const thinking = ref(false);
const toolCalls = ref<AiToolCall[]>([]);
const waitingApproval = ref(false);
const riskLevel = ref<string>("");
const pendingApproval = ref<AiApprovalRequired | null>(null);
const confirming = ref(false);
// 任务时间线（第三阶段）
const currentTaskId = ref<number | null>(null);
const taskSteps = ref<AiTaskStep[]>([]);
const taskStatus = ref<string>("");
const rollbacking = ref(false);
const taskHistory = ref<AiTaskInfo[]>([]);

async function loadSessions() {
  sessions.value = await listSessions();
}

async function loadTaskHistory() {
  taskHistory.value = await listTasks();
}

async function handleCreateSession() {
  const session = await createSession("新会话");
  sessions.value.unshift(session);
  await selectSession(session.id);
}

async function selectSession(id: number) {
  currentSession.value = sessions.value.find((s) => s.id === id) ?? null;
  messages.value = await listMessages(id);
  toolCalls.value = [];
  waitingApproval.value = false;
  riskLevel.value = "";
  await scrollToBottom();
}

// ---------- 发送消息 ----------
async function handleSend() {
  const content = input.value.trim();
  if (!content || !currentSession.value || sending.value) return;

  input.value = "";
  sending.value = true;
  thinking.value = true;
  toolCalls.value = [];
  waitingApproval.value = false;
  pendingApproval.value = null;
  currentTaskId.value = null;
  taskSteps.value = [];
  taskStatus.value = "";

  messages.value.push({
    id: Date.now(),
    sessionId: currentSession.value.id,
    role: "user",
    content,
    toolCalls: null,
    toolResults: null,
    createdAt: new Date().toISOString(),
  });
  await scrollToBottom();

  try {
    const result = await sendMessage(currentSession.value.id, content, handleSseEvent);
    messages.value.push({
      id: Date.now() + 1,
      sessionId: currentSession.value.id,
      role: "assistant",
      content: result.content,
      toolCalls: result.toolCalls,
      toolResults: null,
      createdAt: new Date().toISOString(),
    });
    riskLevel.value = result.riskLevel;
    waitingApproval.value = result.waitingApproval;
  } catch (error) {
    LewMessage.error(error instanceof Error ? error.message : "AI 请求失败");
  } finally {
    sending.value = false;
    thinking.value = false;
    await scrollToBottom();
  }
}

function handleSseEvent(event: AiSseEvent) {
  switch (event.type) {
    case "thinking":
      thinking.value = true;
      break;
    case "tool_call": {
      const data = event.data as { name: string; arguments: Record<string, unknown> };
      toolCalls.value.push({ name: data.name, arguments: data.arguments });
      break;
    }
    case "tool_result": {
      const data = event.data as { name: string; result: unknown };
      const call = toolCalls.value.find((c) => c.name === data.name);
      if (call) call.result = data.result;
      break;
    }
    case "approval_required": {
      const data = event.data as AiApprovalRequired;
      pendingApproval.value = data;
      waitingApproval.value = true;
      riskLevel.value = data.riskLevel;
      break;
    }
    case "message":
      thinking.value = false;
      break;
    case "error":
      LewMessage.error((event.data as { message?: string })?.message ?? "AI 处理失败");
      break;
    // ---------- 任务时间线（第三阶段） ----------
    case "task_created": {
      const data = event.data as {
        taskId: number;
        goal: string;
        stepCount: number;
      };
      currentTaskId.value = data.taskId;
      taskSteps.value = [];
      taskStatus.value = "RUNNING";
      break;
    }
    case "task_step": {
      const data = event.data as {
        taskId: number;
        index: number;
        toolName: string;
        status: "RUNNING" | "SUCCESS" | "FAILED";
        result?: unknown;
      };
      const existing = taskSteps.value.find((s) => s.stepIndex === data.index);
      if (existing) {
        existing.status = data.status;
        existing.output = data.result;
      } else {
        taskSteps.value.push({
          id: data.index,
          taskId: data.taskId,
          stepIndex: data.index,
          toolName: data.toolName,
          status: data.status,
          output: data.result,
          riskLevel: "",
        });
      }
      break;
    }
    case "task_completed": {
      const data = event.data as { taskId: number; status: string; error?: string };
      taskStatus.value = data.status;
      if (data.error) LewMessage.error(data.error);
      break;
    }
  }
}

async function scrollToBottom() {
  await nextTick();
  const container = document.getElementById("ai-messages");
  if (container) container.scrollTop = container.scrollHeight;
}

// ---------- 确认/取消操作 ----------
async function handleConfirm() {
  if (!pendingApproval.value || confirming.value) return;
  confirming.value = true;
  try {
    const { toolName } = await confirmAction(
      pendingApproval.value.intentId,
      pendingApproval.value.confirmToken,
    );
    LewMessage.success("操作已执行");
    const call = toolCalls.value.find((c) => c.name === toolName);
    if (call) call.result = { status: "executed" };
    pendingApproval.value = null;
    waitingApproval.value = false;
  } catch (error) {
    LewMessage.error(error instanceof Error ? error.message : "确认失败");
  } finally {
    confirming.value = false;
  }
}

async function handleReject() {
  if (!pendingApproval.value || confirming.value) return;
  confirming.value = true;
  try {
    await rejectAction(pendingApproval.value.intentId, "用户取消");
    LewMessage.info("已取消操作");
    pendingApproval.value = null;
    waitingApproval.value = false;
  } catch (error) {
    LewMessage.error(error instanceof Error ? error.message : "取消失败");
  } finally {
    confirming.value = false;
  }
}

// ---------- 撤销任务（Undo） ----------
async function handleRollbackTask(taskId: number) {
  if (rollbacking.value) return;
  rollbacking.value = true;
  try {
    await rollbackTask(taskId);
    LewMessage.success("已撤销操作");
    // 刷新任务历史
    taskHistory.value = await listTasks();
  } catch (error) {
    LewMessage.error(error instanceof Error ? error.message : "撤销失败");
  } finally {
    rollbacking.value = false;
  }
}

/** 任务步骤状态颜色 */
function stepColor(status: string): "success" | "warning" | "danger" | "info" {
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "danger";
  if (status === "RUNNING") return "warning";
  return "info";
}

function stepText(status: string): string {
  const map: Record<string, string> = {
    PENDING: "等待中",
    RUNNING: "执行中",
    SUCCESS: "成功",
    FAILED: "失败",
    SKIPPED: "已跳过",
    WAITING_APPROVAL: "等待确认",
  };
  return map[status] ?? status;
}

// ---------- 数据展示辅助 ----------
/** 判断 Tool 返回结果是否为分页用户列表 */
function isUserList(result: unknown): boolean {
  return (
    !!result &&
    typeof result === "object" &&
    Array.isArray((result as { items?: unknown }).items) &&
    (result as { items?: unknown[] }).items!.length > 0
  );
}

/** 格式化工具参数为简洁文本 */
function formatArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(args ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    const label = { page: "页码", pageSize: "每页", status: "状态", keyword: "关键字" }[key] ?? key;
    parts.push(`${label}: ${String(value)}`);
  }
  return parts.length ? parts.join(" · ") : "无参数";
}

/** 风险等级标签颜色 */
function riskColor(level: string): "success" | "warning" | "danger" {
  if (level === "L0" || level === "L1") return "success";
  if (level === "L2") return "warning";
  return "danger";
}

function riskText(level: string): string {
  const map: Record<string, string> = {
    L0: "L0 只读",
    L1: "L1 低风险",
    L2: "L2 中风险",
    L3: "L3 高风险",
  };
  return map[level] ?? level;
}

onMounted(() => {
  void loadSessions();
  void loadTaskHistory();
});
</script>

<template>
  <div class="flex h-full gap-3 p-3">
    <!-- 左侧：会话列表（可折叠） -->
    <aside
      class="flex flex-col shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] overflow-hidden transition-[width] duration-200"
      :style="{ width: leftWidth }"
    >
      <!-- 头部 -->
      <div
        class="flex items-center justify-between h-12 shrink-0 px-3 border-b border-[var(--app-border)]"
        :class="{ 'px-2 justify-center': leftCollapsed }"
      >
        <template v-if="!leftCollapsed">
          <span class="text-14px font-600">会话</span>
          <LewButton size="small" @click="handleCreateSession">
            <template #icon><Plus :size="14" /></template>
            新建
          </LewButton>
        </template>
        <LewButton v-else size="small" single-icon @click="handleCreateSession">
          <template #icon><Plus :size="16" /></template>
        </LewButton>
      </div>

      <!-- 会话列表 -->
      <div class="flex-1 overflow-y-auto p-2">
        <template v-if="!leftCollapsed">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="px-3 py-2 mb-1 rounded-md cursor-pointer text-13px transition-colors"
            :class="
              currentSession?.id === session.id
                ? 'bg-[var(--lew-color-primary)] text-white'
                : 'hover:bg-[var(--app-bg-hover)]'
            "
            @click="selectSession(session.id)"
          >
            <div class="truncate">{{ session.title }}</div>
            <div
              class="text-11px mt-0.5"
              :class="
                currentSession?.id === session.id ? 'text-white/70' : 'text-[var(--app-text-muted)]'
              "
            >
              {{ formatDateTime(session.updatedAt) }}
            </div>
          </div>
          <div
            v-if="!sessions.length"
            class="text-12px text-[var(--app-text-muted)] text-center py-8"
          >
            暂无会话
          </div>
        </template>
        <!-- 折叠态：只显示会话图标 -->
        <div v-else class="flex flex-col items-center gap-2 pt-2">
          <div
            v-for="session in sessions.slice(0, 6)"
            :key="session.id"
            class="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-colors"
            :class="
              currentSession?.id === session.id
                ? 'bg-[var(--lew-color-primary)] text-white'
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)]'
            "
            :title="session.title"
            @click="selectSession(session.id)"
          >
            <Bot :size="15" />
          </div>
        </div>
      </div>

      <!-- 折叠按钮 -->
      <div
        class="flex items-center justify-center h-9 shrink-0 cursor-pointer text-[var(--app-text-muted)] border-t border-[var(--app-border)] transition-colors hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)]"
        @click="leftCollapsed = !leftCollapsed"
      >
        <ChevronsLeft v-if="!leftCollapsed" :size="16" />
        <ChevronsRight v-else :size="16" />
      </div>
    </aside>

    <!-- 中间：对话 -->
    <section
      class="flex flex-col flex-1 min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)]"
    >
      <div class="flex items-center gap-2 px-4 py-3 border-b border-[var(--app-border)]">
        <Bot :size="18" class="text-[var(--lew-color-primary)]" />
        <span class="text-14px font-600">AI Operations</span>
        <span v-if="currentSession" class="text-12px text-[var(--app-text-muted)] ml-2">
          {{ currentSession.title }}
        </span>
      </div>

      <div id="ai-messages" class="flex-1 overflow-y-auto p-4 space-y-4">
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
              {{ message.content }}
            </div>

            <!-- Tool 调用卡片（assistant 消息携带） -->
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
                  <!-- 用户列表结果 -->
                  <template v-if="isUserList(call.result)">
                    <div class="text-11.5px text-[var(--app-text-muted)] mb-1.5">
                      查询到
                      <span class="font-600 text-[var(--lew-color-primary)]">
                        {{ (call.result as { items: unknown[] }).items.length }}
                      </span>
                      条用户记录
                    </div>
                    <div class="space-y-1">
                      <div
                        v-for="(user, i) in (
                          call.result as { items: Array<Record<string, unknown>> }
                        ).items.slice(0, 5)"
                        :key="i"
                        class="flex items-center gap-2 text-12px rounded-md px-2 py-1.5 bg-[var(--app-bg-hover)]"
                      >
                        <div
                          class="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--lew-color-primary)]/10 text-[var(--lew-color-primary)]"
                        >
                          <Bot :size="12" />
                        </div>
                        <span class="font-500">{{ user.displayName ?? user.username }}</span>
                        <span class="text-[var(--app-text-muted)] truncate">
                          {{ user.email ?? user.username }}
                        </span>
                        <LewTag
                          :type="'light'"
                          :color="user.status === 'active' ? 'success' : 'warning'"
                          size="small"
                        >
                          {{ user.status === "active" ? "启用" : "禁用" }}
                        </LewTag>
                      </div>
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
          <div
            class="w-full max-w-lg rounded-lg border border-orange-500/30 bg-orange-500/5 overflow-hidden"
          >
            <div
              class="flex items-center justify-between px-4 py-3 bg-orange-500/10 border-b border-orange-500/20"
            >
              <div class="flex items-center gap-2">
                <ShieldAlert :size="16" class="text-orange-500" />
                <span class="text-13.5px font-600 text-orange-600">需要确认操作</span>
              </div>
              <LewTag :type="'light'" :color="riskColor(pendingApproval.riskLevel)" size="small">
                {{ riskText(pendingApproval.riskLevel) }}
              </LewTag>
            </div>
            <div class="px-4 py-3">
              <!-- 预览 -->
              <div v-if="pendingApproval.preview" class="mb-3">
                <div class="text-12px text-[var(--app-text-muted)] mb-1">操作预览</div>
                <div class="text-13px font-500">
                  {{ pendingApproval.preview.summary }}
                </div>
                <div class="text-12px text-[var(--app-text-muted)] mt-1">
                  影响数量：{{ pendingApproval.preview.affectedCount }}
                </div>
              </div>
              <div class="text-12.5px text-[var(--app-text-muted)] mb-3">
                工具：{{ pendingApproval.toolName }}
              </div>
              <div class="flex justify-end gap-2">
                <LewButton size="small" :disabled="confirming" @click="handleReject">
                  取消
                </LewButton>
                <LewButton type="fill" size="small" :loading="confirming" @click="handleConfirm">
                  <template #icon><ShieldCheck :size="14" /></template>
                  确认执行
                </LewButton>
              </div>
            </div>
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

      <!-- 输入区 -->
      <div class="p-3 border-t border-[var(--app-border)]">
        <div class="flex items-end gap-2">
          <textarea
            v-model="input"
            rows="2"
            placeholder="输入你的指令，例如：查询最近注册的用户"
            class="flex-1 resize-none rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-13px outline-none focus:border-[var(--lew-color-primary)]"
            @keydown.enter.exact.prevent="handleSend"
          />
          <LewButton type="fill" :disabled="sending || !input.trim()" @click="handleSend">
            <template #icon><Send :size="14" /></template>
            发送
          </LewButton>
        </div>
      </div>
    </section>

    <!-- 右侧：操作详情（默认折叠） -->
    <aside
      class="flex flex-col shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] overflow-hidden transition-[width] duration-200"
      :style="{ width: rightWidth }"
    >
      <!-- 折叠态：窄条 -->
      <div v-if="rightCollapsed" class="flex flex-col items-center py-3 gap-3 h-full">
        <div
          class="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)] hover:text-[var(--app-text-primary)]"
          title="展开操作详情"
          @click="rightCollapsed = false"
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
        <div
          class="flex items-center justify-between px-3 py-3 border-b border-[var(--app-border)]"
        >
          <span class="text-14px font-600">操作详情</span>
          <button
            class="flex items-center justify-center w-6 h-6 rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)] hover:text-[var(--app-text-primary)]"
            @click="rightCollapsed = true"
          >
            <X :size="15" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-3 space-y-3">
          <!-- 风险等级 -->
          <div class="rounded-lg border border-[var(--app-border)] p-3">
            <div class="text-12px text-[var(--app-text-muted)] mb-1.5">风险等级</div>
            <div class="flex items-center gap-1.5">
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
          </div>

          <!-- 审批状态 -->
          <div class="rounded-lg border border-[var(--app-border)] p-3">
            <div class="text-12px text-[var(--app-text-muted)] mb-1.5">审批状态</div>
            <LewTag :type="'light'" :color="waitingApproval ? 'warning' : 'success'" size="small">
              {{ waitingApproval ? "等待确认" : "自动执行" }}
            </LewTag>
          </div>

          <!-- Tool 调用 -->
          <div class="rounded-lg border border-[var(--app-border)] p-3">
            <div class="text-12px text-[var(--app-text-muted)] mb-1.5">Tool 调用</div>
            <div v-if="toolCalls.length" class="space-y-2">
              <div
                v-for="(call, index) in toolCalls"
                :key="index"
                class="text-12.5px rounded-md border border-[var(--app-border)] p-2"
              >
                <div class="flex items-center gap-1.5">
                  <Database :size="13" class="text-[var(--lew-color-primary)]" />
                  <span class="font-600 text-[var(--lew-color-primary)]">{{ call.name }}</span>
                </div>
                <div class="text-[var(--app-text-muted)] mt-1 break-all">
                  {{ formatArgs(call.arguments) }}
                </div>
                <div
                  v-if="call.result !== undefined"
                  class="mt-1 text-11px"
                  :class="call.result ? 'text-green-500' : 'text-[var(--app-text-muted)]'"
                >
                  {{
                    isUserList(call.result)
                      ? `返回 ${(call.result as { items: unknown[] }).items.length} 条`
                      : "已执行"
                  }}
                </div>
              </div>
            </div>
            <div v-else class="text-12px text-[var(--app-text-muted)]">暂无</div>
          </div>

          <!-- 任务时间线（第三阶段） -->
          <div v-if="currentTaskId" class="rounded-lg border border-[var(--app-border)] p-3">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-12px text-[var(--app-text-muted)]">任务时间线 #{{ currentTaskId }}</span>
              <LewTag
                :type="'light'"
                :color="stepColor(taskStatus || 'RUNNING')"
                size="small"
              >
                {{ stepText(taskStatus || "RUNNING") }}
              </LewTag>
            </div>
            <!-- 整体撤销按钮 -->
            <LewButton
              v-if="taskStatus === 'SUCCESS'"
              type="light"
              size="small"
              :loading="rollbacking"
              @click="handleRollbackTask(currentTaskId)"
            >
              <template #icon><RotateCcw :size="12" /></template>
              撤销操作
            </LewButton>
            <!-- 步骤列表 -->
            <div class="mt-2 space-y-1.5">
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

          <!-- 任务历史 -->
          <div class="rounded-lg border border-[var(--app-border)] p-3">
            <div class="text-12px text-[var(--app-text-muted)] mb-1.5">任务历史</div>
            <div v-if="taskHistory.length" class="space-y-2">
              <div
                v-for="task in taskHistory.slice(0, 5)"
                :key="task.id"
                class="text-12px rounded-md border border-[var(--app-border)] p-2"
              >
                <div class="flex items-center gap-1.5">
                  <span class="font-600 text-[var(--lew-color-primary)]">#{{ task.id }}</span>
                  <LewTag
                    :type="'light'"
                    :color="stepColor(task.status)"
                    size="small"
                  >
                    {{ stepText(task.status) }}
                  </LewTag>
                  <button
                    v-if="task.status === 'SUCCESS'"
                    class="ml-auto flex items-center gap-0.5 text-[var(--app-text-muted)] hover:text-[var(--lew-color-primary)]"
                    :disabled="rollbacking"
                    title="撤销任务"
                    @click="handleRollbackTask(task.id)"
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
            <div v-else class="text-12px text-[var(--app-text-muted)]">暂无任务</div>
          </div>
        </div>
      </template>
    </aside>
  </div>
</template>
