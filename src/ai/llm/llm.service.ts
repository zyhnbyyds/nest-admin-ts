import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { LlmChatRequest, LlmChatResponse, LlmProvider } from './llm.interface';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { MockProvider } from './providers/mock.provider';

/**
 * LLM 服务：统一入口，屏蔽具体 Provider。
 *
 * 根据配置选择 Provider：
 * - AI_ENABLED=true 且配置了 DEEPSEEK_API_KEY → DeepSeek
 * - 否则 → Mock（用于开发/演示）
 */
@Injectable()
export class LlmService {
  private readonly provider: LlmProvider;

  constructor(config: AppConfigService) {
    if (config.ai.AI_ENABLED && config.ai.DEEPSEEK_API_KEY) {
      this.provider = new DeepSeekProvider(config);
    } else {
      this.provider = new MockProvider();
    }
  }

  get providerName(): string {
    return this.provider.name;
  }

  chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    return this.provider.chat(request);
  }
}
