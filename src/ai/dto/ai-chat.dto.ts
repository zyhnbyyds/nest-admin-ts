import { z } from 'zod';

/** 创建 AI 会话 */
export const createSessionSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .openapi({ example: '查询用户', description: '会话标题' }),
});

/** 发送 AI 消息 */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(4000)
    .openapi({ example: '查询最近注册的用户', description: '用户消息内容' }),
});

export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
