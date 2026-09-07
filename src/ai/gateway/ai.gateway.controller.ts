import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { AgentEvent } from '../agent/agent.service';
import {
  approveSchema,
  confirmSchema,
  createSessionSchema,
  rejectSchema,
  sendMessageSchema,
} from '../dto/ai-chat.dto';
import { AiGatewayService } from './ai.gateway.service';

type AuthRequest = {
  user: {
    id: number;
    username: string;
    roles: string[];
    permissions: string[];
  };
};
type SseReply = {
  raw: {
    writeHead: (status: number, headers: Record<string, string>) => void;
    write: (chunk: string) => void;
    end: () => void;
  };
};

@ApiTags('AI 操作')
@ApiBearerAuth('access-token')
@Controller('ai')
export class AiGatewayController {
  constructor(private readonly gateway: AiGatewayService) {}

  @Post('sessions')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '创建 AI 会话' })
  @ApiResponse({ status: 200, description: '成功' })
  createSession(@Body() body: unknown, @Req() request: AuthRequest) {
    const parsed = createSessionSchema.parse(body);
    return this.gateway.createSession(request.user.id, parsed.title);
  }

  @Get('sessions')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '获取 AI 会话列表' })
  @ApiResponse({ status: 200, description: '成功' })
  listSessions(@Req() request: AuthRequest) {
    return this.gateway.listSessions(request.user.id);
  }

  @Get('sessions/:id')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '获取 AI 会话详情' })
  @ApiResponse({ status: 200, description: '成功' })
  getSession(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.gateway.getSession(id, request.user.id);
  }

  @Get('sessions/:id/messages')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '获取 AI 会话消息' })
  @ApiResponse({ status: 200, description: '成功' })
  listMessages(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthRequest,
  ) {
    return this.gateway.listMessages(id, request.user.id);
  }

  @Post('sessions/:id/messages')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '发送 AI 消息（SSE 流式返回）' })
  @ApiResponse({ status: 200, description: 'SSE 流' })
  async sendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
    @Res() reply: SseReply,
  ) {
    const parsed = sendMessageSchema.parse(body);
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const send = (event: AgentEvent) => {
      raw.write(
        `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`,
      );
    };

    try {
      const result = await this.gateway.sendMessage(
        id,
        request.user,
        parsed.content,
        send,
      );
      raw.write(`event: task_complete\ndata: ${JSON.stringify(result)}\n\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 处理失败';
      raw.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
    } finally {
      raw.end();
    }
  }

  @Post('action-intents/:id/approve')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '批准 AI 操作意图' })
  @ApiResponse({ status: 200, description: '成功' })
  approve(@Param('id', ParseIntPipe) id: number, @Req() request: AuthRequest) {
    const parsed = approveSchema.parse({ intentId: id });
    return this.gateway.approveAction(parsed.intentId, request.user);
  }

  @Post('action-intents/:id/reject')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '拒绝 AI 操作意图' })
  @ApiResponse({ status: 200, description: '成功' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
    @Req() request: AuthRequest,
  ) {
    const parsed = rejectSchema.parse({ intentId: id, ...(body as object) });
    return this.gateway.rejectAction(
      parsed.intentId,
      request.user,
      parsed.reason,
    );
  }

  @Post('action-intents/confirm')
  @RequirePermissions('ai:chat')
  @ApiOperation({ summary: '确认执行 AI 操作意图' })
  @ApiResponse({ status: 200, description: '成功' })
  async confirm(@Body() body: unknown, @Req() request: AuthRequest) {
    const parsed = confirmSchema.parse(body);
    return this.gateway.confirmAction(
      parsed.intentId,
      parsed.confirmToken,
      request.user,
    );
  }
}
