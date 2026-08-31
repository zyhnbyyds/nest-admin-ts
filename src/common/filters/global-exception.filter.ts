import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodError, type ZodIssue } from 'zod';

/** 常用字段中文名映射，未命中时回退为原始字段 key */
const FIELD_LABELS: Record<string, string> = {
  username: '用户名',
  password: '密码',
  oldPassword: '原密码',
  newPassword: '新密码',
  email: '邮箱',
  phone: '手机号',
  name: '名称',
  key: '标识',
  sort: '排序',
  title: '标题',
  remark: '备注',
  status: '状态',
  dataScope: '数据范围',
  roleId: '角色',
  deptId: '部门',
  menuIds: '菜单',
  type: '类型',
  path: '路径',
  component: '组件',
  permission: '权限标识',
  label: '标签',
  value: '值',
  page: '页码',
  pageSize: '每页条数',
};

function fieldLabel(issue: ZodIssue): string {
  const path = issue.path.join('.');
  const last = issue.path[issue.path.length - 1];
  return FIELD_LABELS[String(last)] ?? path ?? '请求体';
}

/**
 * 把 zod issue 按具体场景映射成自然的中文提示，
 * 避免直接展示 zod 的直译文案（如「数值过小：期望 string >=1 字符」）。
 */
function friendlyIssue(issue: ZodIssue): string {
  const extra = issue as ZodIssue & Record<string, unknown>;
  const origin = extra.origin as string | undefined;
  const isString = origin === 'string';

  switch (issue.code) {
    case 'too_small': {
      const min = extra.minimum as number | undefined;
      if (isString) return min === 1 ? '不能为空' : `至少 ${min} 个字符`;
      return min === undefined ? '数值过小' : `不能小于 ${min}`;
    }
    case 'too_big': {
      const max = extra.maximum as number | undefined;
      if (isString) return `最多 ${max} 个字符`;
      return max === undefined ? '数值过大' : `不能大于 ${max}`;
    }
    case 'invalid_format': {
      const format = extra.format as string | undefined;
      if (format === 'email') return '邮箱格式不正确';
      if (format === 'url') return '链接格式不正确';
      if (format === 'uuid') return 'ID 格式不正确';
      return '格式不正确';
    }
    case 'invalid_type':
      return extra.received === 'undefined' ? '不能为空' : '类型不正确';
    case 'not_multiple_of':
      return `必须是 ${extra.multipleOf} 的倍数`;
    case 'unrecognized_keys':
      return '包含未定义的字段';
    default:
      return issue.message;
  }
}

/**
 * 全局异常过滤器：统一错误响应结构，优化前端错误提示。
 *
 * - ZodError（入参校验失败）→ 400，message 为「字段：原因」的中文数组；
 * - HttpException（业务异常）→ 原样透传状态码与响应体；
 * - 其它未知异常 → 500，返回通用中文提示并记录堆栈，避免把
 *   "Internal server error" 直接抛给前端。
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();

    // 入参校验失败：整理成可读的中文字段提示
    if (exception instanceof ZodError) {
      const messages = exception.issues.map((issue) => {
        return `${fieldLabel(issue)}：${friendlyIssue(issue)}`;
      });
      reply.status(HttpStatus.BAD_REQUEST).send({
        statusCode: HttpStatus.BAD_REQUEST,
        message: messages,
        error: 'Bad Request',
      });
      return;
    }

    // 业务异常：保持 NestJS 原有结构
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const body =
        typeof response === 'string'
          ? { statusCode: status, message: response }
          : response;
      reply.status(status).send(body);
      return;
    }

    // 未知异常：兜底 500 + 中文提示
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误，请稍后重试',
      error: 'Internal Server Error',
    });
  }
}
