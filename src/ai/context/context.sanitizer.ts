import { Injectable } from '@nestjs/common';
import { SENSITIVE_FIELDS } from './context.types';

/**
 * 上下文清洗器：过滤 Tool 返回结果中的敏感字段。
 *
 * Tool 返回的数据必须经过 Sanitizer 才能交给 LLM，防止敏感信息泄露。
 */
@Injectable()
export class ContextSanitizer {
  /** 递归过滤敏感字段 */
  sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        if (SENSITIVE_FIELDS.includes(key)) continue;
        result[key] = this.sanitize(val);
      }
      return result;
    }
    return value;
  }
}
