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
          tool_calls?: Array<{
            id: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };

    const message = data.choices?.[0]?.message;
    const content = message?.content ?? '';
    const toolCalls: LlmToolCall[] = (message?.tool_calls ?? []).map(
      (toolCall) => ({
        id: toolCall.id,
        name: toolCall.function?.name ?? '',
        arguments: safeParse(toolCall.function?.arguments),
      }),
    );

    return { content, toolCalls, raw: data };
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
