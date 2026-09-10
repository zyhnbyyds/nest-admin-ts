import { defineRelations, sql } from 'drizzle-orm';
import {
  boolean,
  datetime,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

const auditColumns = {
  createdAt: timestamp('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow()
    .notNull(),
  deletedAt: datetime('deleted_at'),
  createdBy: bigintId('created_by'),
  updatedBy: bigintId('updated_by'),
};

function bigintId(name: string) {
  return int(name, { unsigned: true });
}

export const departments = mysqlTable(
  'sys_dept',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    parentId: int('parent_id', { unsigned: true }).default(0).notNull(),
    ancestors: varchar('ancestors', { length: 500 }).default('0').notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    sort: int('sort').default(0).notNull(),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 100 }),
    status: mysqlEnum('status', ['active', 'disabled'])
      .default('active')
      .notNull(),
    ...auditColumns,
  },
  (table) => [index('idx_dept_parent').on(table.parentId)],
);

export const users = mysqlTable(
  'sys_user',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    deptId: int('dept_id', { unsigned: true }),
    username: varchar('username', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 64 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    email: varchar('email', { length: 100 }),
    phone: varchar('phone', { length: 20 }),
    avatar: varchar('avatar', { length: 500 }),
    status: mysqlEnum('status', ['active', 'disabled'])
      .default('active')
      .notNull(),
    loginAt: datetime('login_at'),
    loginIp: varchar('login_ip', { length: 45 }),
    passwordChangedAt: datetime('password_changed_at'),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('uq_user_username').on(table.username),
    index('idx_user_dept').on(table.deptId),
    foreignKey({
      columns: [table.deptId],
      foreignColumns: [departments.id],
      name: 'fk_user_dept',
    }).onDelete('set null'),
  ],
);

export const roles = mysqlTable(
  'sys_role',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    key: varchar('role_key', { length: 100 }).notNull(),
    sort: int('sort').default(0).notNull(),
    dataScope: mysqlEnum('data_scope', [
      'all',
      'custom',
      'dept',
      'dept_and_children',
      'self',
    ])
      .default('all')
      .notNull(),
    status: mysqlEnum('status', ['active', 'disabled'])
      .default('active')
      .notNull(),
    isSystem: boolean('is_system').default(false).notNull(),
    remark: varchar('remark', { length: 500 }),
    ...auditColumns,
  },
  (table) => [uniqueIndex('uq_role_key').on(table.key)],
);

export const menus = mysqlTable(
  'sys_menu',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    parentId: int('parent_id', { unsigned: true }).default(0).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    title: varchar('title', { length: 100 }).notNull(),
    type: mysqlEnum('type', ['M', 'C', 'F']).notNull(),
    path: varchar('path', { length: 255 }),
    component: varchar('component', { length: 255 }),
    permission: varchar('permission', { length: 255 }),
    icon: varchar('icon', { length: 100 }),
    sort: int('sort').default(0).notNull(),
    visible: boolean('visible').default(true).notNull(),
    cacheable: boolean('cacheable').default(false).notNull(),
    external: boolean('external').default(false).notNull(),
    status: mysqlEnum('status', ['active', 'disabled'])
      .default('active')
      .notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex('uq_menu_permission').on(table.permission),
    index('idx_menu_parent').on(table.parentId),
  ],
);

export const userRoles = mysqlTable(
  'sys_user_role',
  {
    userId: int('user_id', { unsigned: true }).notNull(),
    roleId: int('role_id', { unsigned: true }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_user_role').on(table.userId, table.roleId),
    index('idx_user_role_role').on(table.roleId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_user_role_user',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'fk_user_role_role',
    }).onDelete('cascade'),
  ],
);

/** 角色-部门（自定义数据权限范围时指定可见部门） */
export const roleDepts = mysqlTable(
  'sys_role_dept',
  {
    roleId: int('role_id', { unsigned: true }).notNull(),
    deptId: int('dept_id', { unsigned: true }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_role_dept').on(table.roleId, table.deptId),
    index('idx_role_dept_dept').on(table.deptId),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'fk_role_dept_role',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.deptId],
      foreignColumns: [departments.id],
      name: 'fk_role_dept_dept',
    }).onDelete('cascade'),
  ],
);
export const roleMenus = mysqlTable(
  'sys_role_menu',
  {
    roleId: int('role_id', { unsigned: true }).notNull(),
    menuId: int('menu_id', { unsigned: true }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_role_menu').on(table.roleId, table.menuId),
    index('idx_role_menu_menu').on(table.menuId),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: 'fk_role_menu_role',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.menuId],
      foreignColumns: [menus.id],
      name: 'fk_role_menu_menu',
    }).onDelete('cascade'),
  ],
);
export const posts = mysqlTable(
  'sys_post',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    key: varchar('post_key', { length: 100 }).notNull(),
    sort: int('sort').default(0).notNull(),
    status: mysqlEnum('status', ['active', 'disabled'])
      .default('active')
      .notNull(),
    remark: varchar('remark', { length: 500 }),
    ...auditColumns,
  },
  (table) => [uniqueIndex('uq_post_key').on(table.key)],
);
export const userPosts = mysqlTable(
  'sys_user_post',
  {
    userId: int('user_id', { unsigned: true }).notNull(),
    postId: int('post_id', { unsigned: true }).notNull(),
  },
  (table) => [
    uniqueIndex('uq_user_post').on(table.userId, table.postId),
    index('idx_user_post_post').on(table.postId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_user_post_user',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.postId],
      foreignColumns: [posts.id],
      name: 'fk_user_post_post',
    }).onDelete('cascade'),
  ],
);
export const refreshTokens = mysqlTable(
  'sys_refresh_token',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    userId: int('user_id', { unsigned: true }).notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: datetime('expires_at').notNull(),
    revokedAt: datetime('revoked_at'),
    device: varchar('device', { length: 255 }),
    ip: varchar('ip', { length: 45 }),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_refresh_token_hash').on(table.tokenHash),
    index('idx_refresh_user').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_refresh_token_user',
    }).onDelete('cascade'),
  ],
);
export const dictionaries = mysqlTable(
  'sys_dict_data',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    type: varchar('dict_type', { length: 100 }).notNull(),
    label: varchar('label', { length: 100 }).notNull(),
    value: varchar('value', { length: 100 }).notNull(),
    sort: int('sort').default(0).notNull(),
    status: mysqlEnum('status', ['active', 'disabled'])
      .default('active')
      .notNull(),
    cssClass: varchar('css_class', { length: 100 }),
    listClass: varchar('list_class', { length: 100 }),
    ...auditColumns,
  },
  (table) => [uniqueIndex('uq_dict_type_value').on(table.type, table.value)],
);
export const dictTypes = mysqlTable(
  'sys_dict_type',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    status: mysqlEnum('status', ['active', 'disabled'])
      .default('active')
      .notNull(),
    remark: varchar('remark', { length: 500 }),
    ...auditColumns,
  },
  (table) => [uniqueIndex('uq_dict_type').on(table.type)],
);
export const configs = mysqlTable(
  'sys_config',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    key: varchar('config_key', { length: 100 }).notNull(),
    value: varchar('value', { length: 500 }).notNull(),
    builtin: boolean('builtin').default(false).notNull(),
    remark: varchar('remark', { length: 500 }),
    ...auditColumns,
  },
  (table) => [uniqueIndex('uq_config_key').on(table.key)],
);
export const operationLogs = mysqlTable(
  'sys_operation_log',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    userId: int('user_id', { unsigned: true }),
    title: varchar('title', { length: 100 }).notNull(),
    businessType: varchar('business_type', { length: 50 }).notNull(),
    method: varchar('method', { length: 255 }).notNull(),
    requestMethod: varchar('request_method', { length: 10 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    ip: varchar('ip', { length: 45 }),
    requestBody: json('request_body'),
    responseBody: json('response_body'),
    status: mysqlEnum('status', ['success', 'failure']).notNull(),
    errorMessage: varchar('error_message', { length: 2000 }),
    durationMs: int('duration_ms', { unsigned: true }).notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('idx_operation_log_user_time').on(table.userId, table.createdAt),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_operation_log_user',
    }).onDelete('set null'),
  ],
);
export const loginLogs = mysqlTable(
  'sys_login_log',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    userId: int('user_id', { unsigned: true }),
    username: varchar('username', { length: 64 }).notNull(),
    ip: varchar('ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    status: mysqlEnum('status', ['success', 'failure']).notNull(),
    message: varchar('message', { length: 500 }),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('idx_login_log_user').on(table.userId),
    index('idx_login_log_time').on(table.createdAt),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_login_log_user',
    }).onDelete('set null'),
  ],
);
export const jobs = mysqlTable(
  'sys_job',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    handler: varchar('handler', { length: 255 }).notNull(),
    cron: varchar('cron', { length: 100 }).notNull(),
    status: mysqlEnum('status', ['active', 'disabled'])
      .default('active')
      .notNull(),
    concurrent: boolean('concurrent').default(true).notNull(),
    remark: varchar('remark', { length: 500 }),
    ...auditColumns,
  },
  (table) => [uniqueIndex('uq_job_handler').on(table.handler)],
);
export const jobLogs = mysqlTable(
  'sys_job_log',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    jobId: int('job_id', { unsigned: true }).notNull(),
    jobName: varchar('job_name', { length: 100 }).notNull(),
    handler: varchar('handler', { length: 255 }).notNull(),
    status: mysqlEnum('status', ['success', 'failure']).notNull(),
    message: varchar('message', { length: 2000 }),
    startedAt: timestamp('started_at').notNull(),
    finishedAt: timestamp('finished_at').notNull(),
    durationMs: int('duration_ms', { unsigned: true }).notNull(),
  },
  (table) => [
    index('idx_job_log_job').on(table.jobId),
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobs.id],
      name: 'fk_job_log_job',
    }).onDelete('cascade'),
  ],
);
export const files = mysqlTable(
  'sys_file',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    path: varchar('path', { length: 500 }).notNull(),
    mime: varchar('mime', { length: 100 }).notNull(),
    ext: varchar('ext', { length: 20 }).notNull(),
    size: int('size', { unsigned: true }).notNull(),
    createdBy: int('created_by', { unsigned: true }),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('idx_file_created_by').on(table.createdBy),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'fk_file_created_by',
    }).onDelete('set null'),
  ],
);

/** AI 会话：记录一次 AI 对话 */
export const aiSessions = mysqlTable(
  'ai_session',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    userId: int('user_id', { unsigned: true }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    status: mysqlEnum('status', ['active', 'closed'])
      .default('active')
      .notNull(),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow()
      .notNull(),
  },
  (table) => [
    index('idx_ai_session_user').on(table.userId),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_ai_session_user',
    }).onDelete('cascade'),
  ],
);

/** AI 消息：记录一次对话中的每条消息（含 tool 调用与结果） */
export const aiMessages = mysqlTable(
  'ai_message',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    sessionId: int('session_id', { unsigned: true }).notNull(),
    role: mysqlEnum('role', ['user', 'assistant', 'tool', 'system']).notNull(),
    content: text('content'),
    toolCalls: json('tool_calls'),
    toolResults: json('tool_results'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('idx_ai_message_session').on(table.sessionId),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [aiSessions.id],
      name: 'fk_ai_message_session',
    }).onDelete('cascade'),
  ],
);

/** AI 审计日志：记录 AI 操作全过程 */
export const aiAuditLogs = mysqlTable(
  'ai_audit_log',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    userId: int('user_id', { unsigned: true }),
    sessionId: int('session_id', { unsigned: true }),
    action: varchar('action', { length: 100 }).notNull(),
    toolName: varchar('tool_name', { length: 100 }),
    riskLevel: varchar('risk_level', { length: 10 }),
    permission: varchar('permission', { length: 100 }),
    scope: varchar('scope', { length: 100 }),
    result: mysqlEnum('result', ['allowed', 'denied', 'error']).notNull(),
    metadata: json('metadata'),
    createdAt: timestamp('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index('idx_ai_audit_user').on(table.userId),
    index('idx_ai_audit_session').on(table.sessionId),
    index('idx_ai_audit_time').on(table.createdAt),
  ],
);

/** AI 操作意图：记录待审批的 AI 操作 */
export const aiActionIntents = mysqlTable(
  'ai_action_intent',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    sessionId: int('session_id', { unsigned: true }),
    userId: int('user_id', { unsigned: true }).notNull(),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    input: json('input'),
    inputHash: varchar('input_hash', { length: 64 }).notNull(),
    beforeHash: varchar('before_hash', { length: 64 }),
    confirmToken: varchar('confirm_token', { length: 128 }),
    riskLevel: varchar('risk_level', { length: 10 }).notNull(),
    status: mysqlEnum('status', [
      'PENDING',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'EXECUTED',
      'CANCELLED',
    ])
      .default('PENDING')
      .notNull(),
    /** 关联任务（审批操作也纳入任务时间线） */
    taskId: int('task_id', { unsigned: true }),
    /** 关联任务步骤（确认执行后更新步骤状态与 undo 快照） */
    taskStepId: int('task_step_id', { unsigned: true }),
    expiresAt: datetime('expires_at').notNull(),
    executedAt: datetime('executed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_ai_action_intent_user').on(table.userId),
    index('idx_ai_action_intent_status').on(table.status),
    index('idx_ai_action_intent_token').on(table.confirmToken),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [aiSessions.id],
      name: 'fk_ai_action_intent_session',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_ai_action_intent_user',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [aiTasks.id],
      name: 'fk_ai_action_intent_task',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.taskStepId],
      foreignColumns: [aiTaskSteps.id],
      name: 'fk_ai_action_intent_task_step',
    }).onDelete('set null'),
  ],
);

/** AI 审批记录 */
export const aiApprovals = mysqlTable(
  'ai_approval',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    actionIntentId: int('action_intent_id', { unsigned: true }).notNull(),
    approverId: int('approver_id', { unsigned: true }).notNull(),
    status: mysqlEnum('status', ['APPROVED', 'REJECTED']).notNull(),
    reason: varchar('reason', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_ai_approval_intent').on(table.actionIntentId),
    foreignKey({
      columns: [table.actionIntentId],
      foreignColumns: [aiActionIntents.id],
      name: 'fk_ai_approval_intent',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.approverId],
      foreignColumns: [users.id],
      name: 'fk_ai_approval_approver',
    }).onDelete('cascade'),
  ],
);

/** AI 任务：记录一个完整的 AI 多步任务 */
export const aiTasks = mysqlTable(
  'ai_task',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    sessionId: int('session_id', { unsigned: true }),
    userId: int('user_id', { unsigned: true }).notNull(),
    status: mysqlEnum('status', [
      'PENDING',
      'RUNNING',
      'SUCCESS',
      'FAILED',
      'CANCELLED',
    ])
      .default('PENDING')
      .notNull(),
    riskLevel: varchar('risk_level', { length: 10 }).notNull(),
    goal: varchar('goal', { length: 500 }).notNull(),
    error: varchar('error', { length: 1000 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('idx_ai_task_session').on(table.sessionId),
    index('idx_ai_task_user').on(table.userId),
    foreignKey({
      columns: [table.sessionId],
      foreignColumns: [aiSessions.id],
      name: 'fk_ai_task_session',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'fk_ai_task_user',
    }).onDelete('cascade'),
  ],
);

/** AI 任务步骤：记录任务中的每一步 */
export const aiTaskSteps = mysqlTable(
  'ai_task_step',
  {
    id: int('id', { unsigned: true }).autoincrement().primaryKey(),
    taskId: int('task_id', { unsigned: true }).notNull(),
    stepIndex: int('step_index').notNull(),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    input: json('input'),
    output: json('output'),
    status: mysqlEnum('status', [
      'PENDING',
      'RUNNING',
      'SUCCESS',
      'FAILED',
      'SKIPPED',
      'WAITING_APPROVAL',
    ])
      .default('PENDING')
      .notNull(),
    riskLevel: varchar('risk_level', { length: 10 }).notNull(),
    error: varchar('error', { length: 1000 }),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('idx_ai_task_step_task').on(table.taskId),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [aiTasks.id],
      name: 'fk_ai_task_step_task',
    }).onDelete('cascade'),
  ],
);

export const relations = defineRelations(
  {
    departments,
    users,
    roles,
    menus,
    userRoles,
    roleMenus,
    roleDepts,
    posts,
    userPosts,
    refreshTokens,
    dictionaries,
    dictTypes,
    configs,
    operationLogs,
    loginLogs,
    jobs,
    jobLogs,
    files,
    aiSessions,
    aiMessages,
    aiAuditLogs,
    aiActionIntents,
    aiApprovals,
    aiTasks,
    aiTaskSteps,
  },
  ({
    departments,
    users,
    roles,
    menus,
    userRoles,
    roleMenus,
    roleDepts,
    posts,
    userPosts,
    refreshTokens,
    aiSessions,
    aiMessages,
    aiAuditLogs,
    aiActionIntents,
    aiApprovals,
    aiTasks,
    aiTaskSteps,
    one,
    many,
  }) => ({
    users: {
      department: one.departments({
        from: users.deptId,
        to: departments.id,
      }),
      assignments: many.userRoles({
        from: users.id,
        to: userRoles.userId,
      }),
      refreshTokens: many.refreshTokens({
        from: users.id,
        to: refreshTokens.userId,
      }),
    },
    roles: {
      assignments: many.userRoles({
        from: roles.id,
        to: userRoles.roleId,
      }),
      menuAssignments: many.roleMenus({
        from: roles.id,
        to: roleMenus.roleId,
      }),
      deptAssignments: many.roleDepts({
        from: roles.id,
        to: roleDepts.roleId,
      }),
    },
    userRoles: {
      user: one.users({ from: userRoles.userId, to: users.id }),
      role: one.roles({ from: userRoles.roleId, to: roles.id }),
    },
    roleMenus: {
      role: one.roles({ from: roleMenus.roleId, to: roles.id }),
      menu: one.menus({ from: roleMenus.menuId, to: menus.id }),
    },
    roleDepts: {
      role: one.roles({ from: roleDepts.roleId, to: roles.id }),
      department: one.departments({
        from: roleDepts.deptId,
        to: departments.id,
      }),
    },
    posts: {
      assignments: many.userPosts({
        from: posts.id,
        to: userPosts.postId,
      }),
    },
    userPosts: {
      user: one.users({ from: userPosts.userId, to: users.id }),
      post: one.posts({ from: userPosts.postId, to: posts.id }),
    },
    aiSessions: {
      user: one.users({ from: aiSessions.userId, to: users.id }),
      messages: many.aiMessages({
        from: aiSessions.id,
        to: aiMessages.sessionId,
      }),
    },
    aiMessages: {
      session: one.aiSessions({
        from: aiMessages.sessionId,
        to: aiSessions.id,
      }),
    },
    aiAuditLogs: {
      user: one.users({ from: aiAuditLogs.userId, to: users.id }),
      session: one.aiSessions({
        from: aiAuditLogs.sessionId,
        to: aiSessions.id,
      }),
    },
    aiActionIntents: {
      user: one.users({ from: aiActionIntents.userId, to: users.id }),
      session: one.aiSessions({
        from: aiActionIntents.sessionId,
        to: aiSessions.id,
      }),
      approvals: many.aiApprovals({
        from: aiActionIntents.id,
        to: aiApprovals.actionIntentId,
      }),
    },
    aiApprovals: {
      intent: one.aiActionIntents({
        from: aiApprovals.actionIntentId,
        to: aiActionIntents.id,
      }),
      approver: one.users({
        from: aiApprovals.approverId,
        to: users.id,
      }),
    },
    aiTasks: {
      user: one.users({ from: aiTasks.userId, to: users.id }),
      session: one.aiSessions({
        from: aiTasks.sessionId,
        to: aiSessions.id,
      }),
      steps: many.aiTaskSteps({
        from: aiTasks.id,
        to: aiTaskSteps.taskId,
      }),
    },
    aiTaskSteps: {
      task: one.aiTasks({
        from: aiTaskSteps.taskId,
        to: aiTasks.id,
      }),
    },
  }),
);
