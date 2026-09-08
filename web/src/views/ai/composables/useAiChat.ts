import { nextTick, onMounted, ref } from "vue";
import { LewMessage } from "lew-ui";
import {
  confirmAction,
  createSession,
  getTask,
  listMessages,
  listSessions,
  listTasks,
  rejectAction,
  rollbackTask,
  sendMessage,
  updateSessionTitle,
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
import { isPlainOutcome } from "../utils/display";

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
  /** 内嵌确认条交互中：'confirm' | 'cancel'（按钮 loading / 互斥防连点） */
  const approving = ref<"confirm" | "cancel" | null>(null);

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
    pendingApproval.value = null;
    currentTaskId.value = null;
    taskSteps.value = [];
    taskStatus.value = "";
    // 任务历史为该用户全局数据：切换会话时一并刷新，避免展示滞后
    void loadTaskHistory();
    await scrollToBottom();
  }

  /** 重命名会话标题 */
  async function handleRenameSession(id: number, title: string) {
    try {
      const updated = await updateSessionTitle(id, title);
      const idx = sessions.value.findIndex((s) => s.id === id);
      if (idx !== -1) sessions.value[idx] = updated;
      if (currentSession.value?.id === id) currentSession.value = updated;
      LewMessage.success("标题已更新");
    } catch (error) {
      LewMessage.error(error instanceof Error ? error.message : "更新标题失败");
    }
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

    // 用户消息
    messages.value.push({
      id: Date.now(),
      sessionId: currentSession.value.id,
      role: "user",
      content,
      toolCalls: null,
      toolResults: null,
      createdAt: new Date().toISOString(),
    });

    // 占位 assistant 消息（生成中）：SSE 实时驱动 toolCalls 与 content
    const freshId = Date.now() + 1;
    const fresh: AiMessage = {
      id: freshId,
      sessionId: currentSession.value.id,
      role: "assistant",
      content: null,
      toolCalls: [],
      toolResults: null,
      createdAt: new Date().toISOString(),
      _fresh: true,
    };
    messages.value.push(fresh);
    await scrollToBottom();

    try {
      const result = await sendMessage(currentSession.value.id, content, handleSseEvent);
      // SSE 收尾：内容已在流式中实时累积，此处回填工具结果并结束「生成中」状态
      const freshMsg = messages.value.find((m) => m.id === freshId);
      if (freshMsg) {
        freshMsg.toolCalls = result.toolCalls;
        freshMsg.content = freshMsg.content || result.content || null;
        freshMsg._fresh = false;
      }
      riskLevel.value = result.riskLevel;
      waitingApproval.value = result.waitingApproval;
    } catch (error) {
      LewMessage.error(error instanceof Error ? error.message : "AI 请求失败");
      // 失败时移除占位 assistant 消息，避免残留空白气泡
      messages.value = messages.value.filter((m) => m.id !== freshId);
    } finally {
      sending.value = false;
      thinking.value = false;
      // 发送结束（无论是否审批）后刷新任务历史，保证最新任务立即可见
      void loadTaskHistory();
      await scrollToBottom();
    }
  }

  function handleSseEvent(event: AiSseEvent) {
    // 找到当前生成中的占位 assistant 消息
    const freshMsg = messages.value.find((m) => m._fresh);

    switch (event.type) {
      case "thinking":
        thinking.value = true;
        break;
      case "tool_call": {
        const data = event.data as { name: string; arguments: Record<string, unknown> };
        const call = { name: data.name, arguments: data.arguments };
        toolCalls.value.push(call);
        // 同步到占位消息 → 对话区实时出现该步骤（running）
        if (freshMsg) freshMsg.toolCalls?.push(call);
        void scrollToBottom();
        break;
      }
      case "tool_result": {
        const data = event.data as { name: string; result: unknown };
        const update = (list?: AiToolCall[] | null) => {
          if (!list) return;
          // 同名工具可能多次调用：更新最后一个尚无 result 的项
          for (let i = list.length - 1; i >= 0; i--) {
            if (list[i]?.name === data.name && list[i]?.result === undefined) {
              list[i]!.result = data.result;
              break;
            }
          }
        };
        update(toolCalls.value);
        update(freshMsg?.toolCalls);
        void scrollToBottom();
        break;
      }
      case "approval_required": {
        const data = event.data as AiApprovalRequired;
        pendingApproval.value = data;
        waitingApproval.value = true;
        riskLevel.value = data.riskLevel;
        // 立即将相关工具调用标记为“待审批”，让消息内确认条即时出现
        const markWaiting = (list?: AiToolCall[] | null) => {
          if (!list) return;
          for (let i = list.length - 1; i >= 0; i--) {
            if (list[i]?.name === data.toolName && list[i]?.result === undefined) {
              list[i]!.result = { status: "waiting_approval", intentId: data.intentId };
              break;
            }
          }
        };
        markWaiting(toolCalls.value);
        markWaiting(freshMsg?.toolCalls);
        break;
      }
      case "message": {
        // 真流式：文本增量到达即追加到占位消息（实时渲染，无需假打字机）
        const data = event.data as { content?: string };
        thinking.value = false;
        if (freshMsg && data.content) {
          freshMsg.content = (freshMsg.content ?? "") + data.content;
          void scrollToBottom();
        }
        break;
      }
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

  /**
   * 更新「等待审批」步骤的执行状态（同步 toolCalls 与各消息中的步骤）。
   *
   * 只匹配仍处于 waiting_approval、且 intentId（提供时）一致的调用，避免误覆盖
   * 历史中同名但已完结的步骤。不依赖占位消息的 _fresh 状态——审批等待期间
   * 占位消息可能已被打字机完成事件标记为 _fresh=false，仍需能精确回填。
   */
  function updateToolStepStatus(toolName: string, result: unknown, intentId?: number) {
    const isTarget = (c: AiToolCall) => {
      if (c.name !== toolName) return false;
      const r = c.result as { status?: string; intentId?: number } | undefined;
      if (r?.status !== "waiting_approval") return false;
      return intentId === undefined || r.intentId === intentId;
    };
    toolCalls.value.forEach((c) => {
      if (isTarget(c)) c.result = result;
    });
    messages.value.forEach((m) => {
      if (m.role !== "assistant") return;
      m.toolCalls?.forEach((c) => {
        if (isTarget(c)) c.result = result;
      });
    });
  }

  /**
   * 内嵌确认条：确认执行当前待审批操作。
   *
   * 与取消共用 approving 互斥锁，避免按钮连点导致重复请求/重复收尾。
   */
  async function handleApprove() {
    const approval = pendingApproval.value;
    if (!approval || approving.value) return;
    approving.value = "confirm";
    try {
      const { toolName, result, content } = await confirmAction(
        approval.intentId,
        approval.confirmToken,
      );
      await finishApproval(toolName, result ?? { status: "executed" }, content, approval.intentId);
    } catch {
      // 错误提示已由请求拦截器统一弹出，这里把步骤标记为失败并收尾
      await finishApproval(approval.toolName, { status: "error" }, undefined, approval.intentId);
    } finally {
      approving.value = null;
    }
  }

  /** 内嵌确认条：取消当前待审批操作 */
  async function handleReject() {
    const approval = pendingApproval.value;
    if (!approval || approving.value) return;
    approving.value = "cancel";
    try {
      const { content } = await rejectAction(approval.intentId, "用户取消");
      await finishApproval(approval.toolName, { status: "cancelled" }, content, approval.intentId);
    } catch {
      // 错误提示已由请求拦截器统一弹出，这里只做状态收尾
      await finishApproval(
        approval.toolName,
        { status: "cancelled" },
        undefined,
        approval.intentId,
      );
    } finally {
      approving.value = null;
    }
  }

  /**
   * 审批结束（确认/取消/失败）后的统一收尾：
   * 清理等待状态 → 结束「生成中」占位消息 → 更新步骤卡片
   * → 追加收尾文案（确认总结/取消提示） → 刷新任务时间线。
   */
  async function finishApproval(
    toolName: string,
    result: unknown,
    summary?: string,
    intentId?: number,
  ) {
    pendingApproval.value = null;
    waitingApproval.value = false;
    updateToolStepStatus(toolName, result, intentId);

    // 仅当本次步骤仍在本会话消息中才就地收尾，避免会话切换后误写入其它会话
    const hasStep = messages.value.some(
      (m) => m.role === "assistant" && m.toolCalls?.some((c) => c.name === toolName),
    );
    if (hasStep) {
      // 结束「生成中」占位消息：步骤已定稿，避免残留“正在处理...”动画
      messages.value
        .filter((m) => m._fresh && m.toolCalls?.some((c) => c.name === toolName))
        .forEach((m) => {
          m._fresh = false;
        });

      // 审批结果作为对话下文展示：结果条（图标 + 标题）+ 实质正文
      if (summary && currentSession.value) {
        const status = (result as { status?: string } | undefined)?.status;
        const outcome: "success" | "cancelled" | "error" =
          status === "cancelled" ? "cancelled" : status === "error" ? "error" : "success";
        // 后端兜底单句（如“操作「xxx」已执行完成。”）不再重复正文，仅由结果条表达
        const body = isPlainOutcome(summary) ? null : summary;
        messages.value.push({
          id: Date.now(),
          sessionId: currentSession.value.id,
          role: "assistant",
          content: body,
          toolCalls: null,
          // 审批结果元数据持久化于 toolResults，刷新会话后仍能还原结果条
          toolResults: [{ type: "approval_result", outcome, toolName }],
          createdAt: new Date().toISOString(),
        });
        await scrollToBottom();
      }
    }

    // 刷新任务时间线与历史，反映最终状态
    if (currentTaskId.value) {
      try {
        const task = await getTask(currentTaskId.value);
        taskSteps.value = task.steps ?? [];
        taskStatus.value = task.status;
      } catch {
        // 任务可能已不存在，忽略
      }
    }
    void loadTaskHistory();
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
    handleRenameSession,
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
    approving,
    handleApprove,
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
