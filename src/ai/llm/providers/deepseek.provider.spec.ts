import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../../../config/app-config.service';
import { DeepSeekProvider } from './deepseek.provider';

function makeConfig(): AppConfigService {
  return {
    ai: {
      DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
      DEEPSEEK_API_KEY: 'test-key',
      DEEPSEEK_MODEL: 'deepseek-chat',
    },
  } as unknown as AppConfigService;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

/** 把若干 SSE 文本片段拼接成流式响应体 */
function sseResponse(chunks: string[]): Response {
  const text = chunks.join('\n');
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

// 不依赖 vitest 专有的 vi.stubGlobal，手动替换 globalThis.fetch，
// 使测试同时兼容 vitest 与 bun test 两种运行器。
const realFetch = globalThis.fetch;

function stubFetch(mock: typeof fetch) {
  (globalThis as { fetch: typeof fetch }).fetch = mock;
}

afterEach(() => {
  (globalThis as { fetch: typeof fetch }).fetch = realFetch;
});

describe('DeepSeekProvider.chat（非流式）', () => {
  it('解析 content / reasoning_content / tool_calls', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: '最终回答',
              reasoning_content: '内部思考',
              tool_calls: [
                {
                  id: 'call_1',
                  function: { name: 'user_list', arguments: '{"page":1}' },
                },
              ],
            },
          },
        ],
      }),
    );
    stubFetch(fetchMock);

    const provider = new DeepSeekProvider(makeConfig());
    const result = await provider.chat({ messages: [] });

    expect(result.content).toBe('最终回答');
    expect(result.reasoningContent).toBe('内部思考');
    expect(result.toolCalls).toEqual([
      { id: 'call_1', name: 'user_list', arguments: { page: 1 } },
    ]);
  });

  it('请求体带 stream=false，并把 assistant 的 reasoning_content 原样回传', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        jsonResponse({ choices: [{ message: { content: 'ok' } }] }),
    );
    stubFetch(fetchMock);

    const provider = new DeepSeekProvider(makeConfig());
    await provider.chat({
      messages: [
        { role: 'assistant', content: 'x', reasoningContent: 'think-content' },
      ],
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/chat/completions');
    const body = JSON.parse(String(init?.body));
    expect(body.stream).toBeUndefined();
    expect(body.messages[0]).toMatchObject({
      role: 'assistant',
      content: 'x',
      reasoning_content: 'think-content',
    });
  });

  it('HTTP 错误时抛出包含状态码的异常', async () => {
    stubFetch(vi.fn(async () => new Response('bad request', { status: 400 })));
    const provider = new DeepSeekProvider(makeConfig());
    await expect(provider.chat({ messages: [] })).rejects.toThrow(
      /DeepSeek API error: 400/,
    );
  });
});

describe('DeepSeekProvider.chat（流式）', () => {
  it('content 增量实时回调，reasoning/tool_calls 分片拼装正确', async () => {
    stubFetch(
      vi.fn(async () =>
        sseResponse([
          'data: {"choices":[{"delta":{"content":"你"}}]}',
          '',
          'data: {"choices":[{"delta":{"content":"好"}}]}',
          '',
          'data: {"choices":[{"delta":{"reasoning_content":"考"}}]}',
          '',
          'data: {"choices":[{"delta":{"reasoning_content":"虑"}}]}',
          '',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"user_list","arguments":"{\\"page\\":"}}]}}]}',
          '',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"1}"}}]}}]}',
          '',
          'data: [DONE]',
          '',
        ]),
      ),
    );

    const provider = new DeepSeekProvider(makeConfig());
    const deltas: string[] = [];
    const result = await provider.chat({
      messages: [],
      stream: true,
      onDelta: (d) => deltas.push(d),
    });

    // 增量逐块回调
    expect(deltas).toEqual(['你', '好']);
    // 聚合结果：文本 / 思考 / 工具调用
    expect(result.content).toBe('你好');
    expect(result.reasoningContent).toBe('考虑');
    expect(result.toolCalls).toEqual([
      { id: 'c1', name: 'user_list', arguments: { page: 1 } },
    ]);
  });

  it('流式请求体会携带 stream=true', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        sseResponse([
          'data: {"choices":[{"delta":{"content":"hi"}}]}',
          '',
          'data: [DONE]',
          '',
        ]),
    );
    stubFetch(fetchMock);

    const provider = new DeepSeekProvider(makeConfig());
    await provider.chat({ messages: [], stream: true, onDelta: () => {} });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body.stream).toBe(true);
  });
});
