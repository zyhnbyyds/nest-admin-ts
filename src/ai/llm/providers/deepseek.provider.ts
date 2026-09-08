import { AppConfigService } from '../../../config/app-config.service';
import {
  LlmChatRequest,
  LlmChatResponse,
  LlmProvider,
  LlmToolCall,
} from '../llm.interface';

/**
 * DeepSeek Provider（OpenAI 兼容接口）。
 *
 * 通过统一 LlmProvider 接口封装，业务代码不直接依赖 DeepSeek SDK。
 */
export class DeepSeekProvider implements LlmProvider {
  readonly name = 'deepseek';
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;

  constructor(config: AppConfigService) {
    this.baseUrl = config.ai.DEEPSEEK_BASE_URL;
    this.apiKey = config.ai.DEEPSEEK_API_KEY ?? '';
    this.model = config.ai.DEEPSEEK_MODEL;
  }

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    // 流式：content 增量实时回调，思考/工具调用增量在内部拼装后返回（结构同非流式）
    if (request.stream) {
      return this.streamChat(request);
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
          // DeepSeek 思考模式：assistant 的思考内容必须原样回传，否则 400
          ...(message.role === 'assistant' && message.reasoningContent
            ? { reasoning_content: message.reasoningContent }
            : {}),
          ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
          ...(message.toolCalls?.length
            ? {
                tool_calls: message.toolCalls.map((toolCall) => ({
                  id: toolCall.id,
                  type: 'function',
                  function: {
                    name: toolCall.name,
                    arguments: JSON.stringify(toolCall.arguments),
                  },
                })),
              }
            : {}),
        })),
        tools: request.tools?.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        tool_choice:
          request.toolChoice === 'none'
            ? 'none'
            : request.toolChoice === 'required'
              ? 'required'
              : 'auto',
        temperature: request.temperature ?? 0.2,
        ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          reasoning_content?: string | null;
          tool_calls?: Array<{
            id: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };

    const message = data.choices?.[0]?.message;
    const content = message?.content ?? '';
    // DeepSeek 思考模式：保留 reasoning_content，供多轮历史原样回传
    const reasoningContent = message?.reasoning_content ?? '';
    const toolCalls: LlmToolCall[] = (message?.tool_calls ?? []).map(
      (toolCall) => ({
        id: toolCall.id,
        name: toolCall.function?.name ?? '',
        arguments: safeParse(toolCall.function?.arguments),
      }),
    );

    return { content, toolCalls, reasoningContent, raw: data };
  }

  /**
   * 流式实现：请求 body 增加 stream:true，逐块解析 SSE 增量。
   *
   * - content 文本增量实时回调 request.onDelta（用于下游转发 SSE 实现“真流式”展示）
   * - reasoning_content / tool_calls 为分段到达，内部拼接后随结果返回
   */
  private async streamChat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
          // DeepSeek 思考模式：assistant 的思考内容必须原样回传，否则 400
          ...(message.role === 'assistant' && message.reasoningContent
            ? { reasoning_content: message.reasoningContent }
            : {}),
          ...(message.toolCallId ? { tool_call_id: message.toolCallId } : {}),
          ...(message.toolCalls?.length
            ? {
                tool_calls: message.toolCalls.map((toolCall) => ({
                  id: toolCall.id,
                  type: 'function',
                  function: {
                    name: toolCall.name,
                    arguments: JSON.stringify(toolCall.arguments),
                  },
                })),
              }
            : {}),
        })),
        tools: request.tools?.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        tool_choice:
          request.toolChoice === 'none'
            ? 'none'
            : request.toolChoice === 'required'
              ? 'required'
              : 'auto',
        temperature: request.temperature ?? 0.2,
        stream: true,
        ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${text}`);
    }
    if (!response.body) {
      throw new Error('DeepSeek API: 无流式响应体');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let reasoningContent = '';
    // 工具调用增量按 index 累积（name/arguments 可能分片到达）
    const toolAcc: Record<
      number,
      { id: string; name: string; argsRaw: string }
    > = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: Array<{
              delta?: {
                content?: string;
                reasoning_content?: string;
                tool_calls?: Array<{
                  index?: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
            }>;
          };
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;
          if (typeof delta.content === 'string' && delta.content) {
            content += delta.content;
            request.onDelta?.(delta.content);
          }
          if (
            typeof delta.reasoning_content === 'string' &&
            delta.reasoning_content
          ) {
            reasoningContent += delta.reasoning_content;
          }
          for (const toolCall of delta.tool_calls ?? []) {
            const index = toolCall.index ?? 0;
            const acc =
              toolAcc[index] ??
              (toolAcc[index] = { id: '', name: '', argsRaw: '' });
            if (toolCall.id) acc.id = toolCall.id;
            if (toolCall.function?.name) acc.name += toolCall.function.name;
            if (toolCall.function?.arguments)
              acc.argsRaw += toolCall.function.arguments;
          }
        } catch {
          // 忽略无法解析的中间行
        }
      }
    }

    const toolCalls: LlmToolCall[] = Object.keys(toolAcc)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => {
        const acc = toolAcc[Number(key)]!;
        return {
          id: acc.id,
          name: acc.name,
          arguments: safeParse(acc.argsRaw),
        };
      });

    return { content, toolCalls, reasoningContent };
  }
}

function safeParse(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
