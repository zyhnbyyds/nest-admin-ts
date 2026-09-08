import { get, post } from "~/request";
import { useUserStore } from "~/store/user";
import type { AiMessage, AiResult, AiSession, AiSseEvent } from "~/types/api";

/** 创建 AI 会话 */
export function createSession(title?: string) {
  return post<AiSession>("/ai/sessions", { title });
}

/** 获取 AI 会话列表 */
export function listSessions() {
  return get<AiSession[]>("/ai/sessions");
}

/** 获取 AI 会话详情 */
export function getSession(id: number) {
  return get<AiSession>(`/ai/sessions/${id}`);
}

/** 获取 AI 会话消息 */
export function listMessages(sessionId: number) {
  return get<AiMessage[]>(`/ai/sessions/${sessionId}/messages`);
}

/**
 * 发送 AI 消息（SSE 流式返回）。
 *
 * 使用 fetch + ReadableStream 解析 SSE 事件（EventSource 不支持 POST）。
 */
export async function sendMessage(
  sessionId: number,
  content: string,
  onEvent: (event: AiSseEvent) => void,
): Promise<AiResult> {
  const userStore = useUserStore();
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/ai/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userStore.accessToken}`,
      },
      body: JSON.stringify({ content }),
    },
  );

  if (!response.ok || !response.body) {
    throw new Error("AI 请求失败");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AiResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 事件以空行分隔
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const event of events) {
      const lines = event.split("\n");
      let type = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) type = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (type === "task_complete") result = parsed as AiResult;
        onEvent({ type, data: parsed });
      } catch {
        onEvent({ type, data });
      }
    }
  }

  if (!result) {
    throw new Error("AI 未返回结果");
  }
  return result;
}

/** 批准 AI 操作意图 */
export function approveAction(intentId: number) {
  return post<{ id: number; status: string }>(`/ai/action-intents/${intentId}/approve`, {});
}

/** 拒绝 AI 操作意图 */
export function rejectAction(intentId: number, reason?: string) {
  return post<{ id: number; status: string }>(`/ai/action-intents/${intentId}/reject`, { reason });
}

/** 确认执行 AI 操作意图 */
export function confirmAction(intentId: number, confirmToken: string) {
  return post<{ result: unknown; toolName: string }>("/ai/action-intents/confirm", {
    intentId,
    confirmToken,
  });
}

// ---------- 任务（Task / TaskStep / Undo） ----------

export interface AiTaskStepItem {
  id: number;
  taskId: number;
  stepIndex: number;
  toolName: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED" | "WAITING_APPROVAL";
  input?: unknown;
  output?: unknown;
  riskLevel: string;
  error?: string | null;
}

export interface AiTaskItem {
  id: number;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  riskLevel: string;
  goal: string;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
  steps?: AiTaskStepItem[];
}

/** 获取 AI 任务列表 */
export function listTasks() {
  return get<AiTaskItem[]>("/ai/tasks");
}

/** 获取 AI 任务详情（含步骤） */
export function getTask(taskId: number) {
  return get<AiTaskItem>(`/ai/tasks/${taskId}`);
}

/** 撤销任务（Undo） */
export function rollbackTask(taskId: number) {
  return post<{ taskId: number; rolledBack: number }>(`/ai/tasks/${taskId}/rollback`, {});
}
