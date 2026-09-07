import { Injectable } from '@nestjs/common';
import { AiActor } from '../ai.types';

/**
 * 权限服务：判断当前用户是否拥有指定权限。
 *
 * 最终权限 = 当前用户 RBAC ∩ AI Policy ∩ Tool Permission ∩ Data Scope。
 * 这里只负责 RBAC 判断，不能相信 LLM 的自我声明。
 */
@Injectable()
export class PermissionService {
  /** 判断用户是否拥有指定权限（支持 *:*:* 通配） */
  hasPermission(actor: AiActor, permission: string): boolean {
    return (
      actor.permissions.includes('*:*:*') ||
      actor.permissions.includes(permission)
    );
  }
}
