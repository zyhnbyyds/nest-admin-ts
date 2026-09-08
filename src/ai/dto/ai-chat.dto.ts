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

/** 更新 AI 会话标题 */
export const updateSessionTitleSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200)
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

/** 批准/拒绝操作意图 */
export const approveSchema = z.object({
  intentId: z.number().int().positive(),
});

export const rejectSchema = z.object({
  intentId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

/** 用户确认后执行操作意图 */
export const confirmSchema = z.object({
  intentId: z.number().int().positive(),
  confirmToken: z.string().min(1).max(128),
});

export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type ApproveDto = z.infer<typeof approveSchema>;
export type RejectDto = z.infer<typeof rejectSchema>;
export type ConfirmDto = z.infer<typeof confirmSchema>;
