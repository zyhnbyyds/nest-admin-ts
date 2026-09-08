import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service';
import { AiActor, AiErrorCode, AiException, RiskLevel } from '../ai.types';

/** Capability Token 载荷 */
export interface CapabilityPayload {
  tool: string;
  user: { id: number; username: string };
  scope: string;
  maxItems: number;
  riskLevel: RiskLevel;
  exp: number;
  nonce: string;
}

/**
 * Capability Token：Policy Engine 通过后生成的一次性能力令牌。
 *
 * Tool Executor 执行前验证 Capability，进一步降低 AI 权限。
 * 包含：tool / user / scope / maxItems / 有效期（5 分钟）。
 */
@Injectable()
export class CapabilityService {
  private readonly secret: string;

  constructor(config: AppConfigService) {
    this.secret = `${config.jwt.JWT_ACCESS_SECRET}:capability`;
  }

  /** 生成 Capability Token（签名） */
  issue(payload: Omit<CapabilityPayload, 'nonce'>): string {
    const full: CapabilityPayload = {
      ...payload,
      nonce: randomBytes(8).toString('hex'),
    };
    const body = Buffer.from(JSON.stringify(full)).toString('base64url');
    const sig = this.sign(body);
    return `${body}.${sig}`;
  }

  /** 验证 Capability Token */
  verify(token: string): CapabilityPayload {
    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new AiException(AiErrorCode.PERMISSION_DENIED, '无效的能力令牌');
    }
    const [body, sig] = parts as [string, string];
    if (this.sign(body) !== sig) {
      throw new AiException(AiErrorCode.PERMISSION_DENIED, '能力令牌签名无效');
    }
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as CapabilityPayload;
    if (payload.exp < Date.now()) {
      throw new AiException(AiErrorCode.ACTION_EXPIRED, '能力令牌已过期');
    }
    return payload;
  }

  /** 校验 Capability 是否允许某操作 */
  authorize(
    token: string,
    tool: string,
    actor: AiActor,
  ): CapabilityPayload {
    const payload = this.verify(token);
    if (payload.tool !== tool) {
      throw new AiException(AiErrorCode.PERMISSION_DENIED, '能力令牌不匹配工具');
    }
    if (payload.user.id !== actor.id) {
      throw new AiException(AiErrorCode.PERMISSION_DENIED, '能力令牌不匹配用户');
    }
    return payload;
  }

  /** 校验批量数量是否在限制内 */
  assertItemCount(payload: CapabilityPayload, count: number): void {
    if (count > payload.maxItems) {
      throw new AiException(
        AiErrorCode.RISK_DENIED,
        `批量操作超过能力限制（最大 ${payload.maxItems} 条）`,
      );
    }
  }

  private sign(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('hex');
  }
}