import { nextTick, onMounted, ref } from "vue";
import { LewMessage } from "lew-ui";
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
import type {
  AiApprovalRequired,
  AiMessage,
  AiSession,
  AiSseEvent,
  AiTaskInfo,
  AiTaskStep,
  AiToolCall,
} from "~/types/api";

/**
 * AI 操作页核心逻辑。
 *
 * 统一管理：会话列表、当前会话、消息流、SSE 事件、审批确认、任务时间线与撤销。
 * 供 index.vue 编排，并向下分发到各展示组件。
 */
export function useAiChat() {
  // ---------- 会话 ----------
  const sessions = ref<AiSession[]>([]);
  const currentSession = ref<AiSession | null>(null);
  const messages = ref<AiMessage[]>([]);

  // ---------- 发送状态 ----------
  const input = ref("");
  const sending = ref(false);
  const thinking = ref(false);
  const toolCalls = ref<AiToolCall[]>([]);

  // ---------- 审批 ----------
  const waitingApproval = ref(false);
  const riskLevel = ref<string>("");
  const pendingApproval = ref<AiApprovalRequired | null>(null);
  const confirming = ref(false);

  // ---------- 任务时间线 ----------
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
      // ---------- 任务时间线 ----------
      case "task_created": {
        const data = event.data as { taskId: number; goal: string; stepCount: number };
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
      taskHistory.value = await listTasks();
    } catch (error) {
      LewMessage.error(error instanceof Error ? error.message : "撤销失败");
    } finally {
      rollbacking.value = false;
    }
  }

  onMounted(() => {
    void loadSessions();
    void loadTaskHistory();
  });

  return {
    // 会话
    sessions,
    currentSession,
    messages,
    handleCreateSession,
    selectSession,
    // 发送
    input,
    sending,
    thinking,
    toolCalls,
    handleSend,
    // 审批
    waitingApproval,
    riskLevel,
    pendingApproval,
    confirming,
    handleConfirm,
    handleReject,
    // 任务
    currentTaskId,
    taskSteps,
    taskStatus,
    rollbacking,
    taskHistory,
    handleRollbackTask,
  };
}
