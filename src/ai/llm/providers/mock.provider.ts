import { LlmChatRequest, LlmChatResponse, LlmProvider } from '../llm.interface';

/**
 * Mock Provider：未配置真实 LLM API Key 时用于跑通流程。
 *
 * 仅做非常简单的关键词匹配，用于开发/演示，不用于生产。
 */
export class MockProvider implements LlmProvider {
  readonly name = 'mock';

  async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const lastUser = [...request.messages]
      .reverse()
      .find((message) => message.role === 'user');
    const text = lastUser?.content ?? '';

    // 简单关键词匹配：查询用户
    if (/查询|查一下|查|找|列出|最近|用户|用户列表/.test(text)) {
      return {
        content: '',
        toolCalls: [
          {
            id: 'mock-call-1',
            name: 'user.list',
            arguments: { page: 1, pageSize: 20 },
          },
        ],
      };
    }

    return {
      content:
        '（Mock 模式）我理解你的请求，但当前未配置真实 LLM。请配置 DEEPSEEK_API_KEY 以获得完整能力。',
      toolCalls: [],
    };
  }
}
