import { relations } from 'drizzle-orm';
import { boolean, datetime, foreignKey, index, int, json, mysqlEnum, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

const auditColumns = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  deletedAt: datetime('deleted_at'),
  createdBy: bigintId('created_by'),
  updatedBy: bigintId('updated_by'),
};

function bigintId(name: string) { return int(name, { unsigned: true }); }

export const departments = mysqlTable('sys_dept', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), parentId: int('parent_id', { unsigned: true }).default(0).notNull(), ancestors: varchar('ancestors', { length: 500 }).default('0').notNull(),
  name: varchar('name', { length: 50 }).notNull(), sort: int('sort').default(0).notNull(), leaderUserId: int('leader_user_id', { unsigned: true }), phone: varchar('phone', { length: 20 }), email: varchar('email', { length: 100 }),
  status: mysqlEnum('status', ['active', 'disabled']).default('active').notNull(), ...auditColumns,
}, (table) => [index('idx_dept_parent').on(table.parentId)]);

export const users = mysqlTable('sys_user', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), deptId: int('dept_id', { unsigned: true }), username: varchar('username', { length: 64 }).notNull(), displayName: varchar('display_name', { length: 64 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(), email: varchar('email', { length: 100 }), phone: varchar('phone', { length: 20 }), avatar: varchar('avatar', { length: 500 }),
  status: mysqlEnum('status', ['active', 'disabled']).default('active').notNull(), loginAt: datetime('login_at'), loginIp: varchar('login_ip', { length: 45 }), passwordChangedAt: datetime('password_changed_at'), ...auditColumns,
}, (table) => [uniqueIndex('uq_user_username').on(table.username), index('idx_user_dept').on(table.deptId), foreignKey({ columns: [table.deptId], foreignColumns: [departments.id], name: 'fk_user_dept' }).onDelete('set null')]);

export const roles = mysqlTable('sys_role', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), name: varchar('name', { length: 50 }).notNull(), key: varchar('role_key', { length: 100 }).notNull(), sort: int('sort').default(0).notNull(),
  dataScope: mysqlEnum('data_scope', ['all', 'custom', 'dept', 'dept_and_children', 'self']).default('all').notNull(), status: mysqlEnum('status', ['active', 'disabled']).default('active').notNull(), isSystem: boolean('is_system').default(false).notNull(), remark: varchar('remark', { length: 500 }), ...auditColumns,
}, (table) => [uniqueIndex('uq_role_key').on(table.key)]);

export const menus = mysqlTable('sys_menu', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), parentId: int('parent_id', { unsigned: true }).default(0).notNull(), name: varchar('name', { length: 100 }).notNull(), title: varchar('title', { length: 100 }).notNull(),
  type: mysqlEnum('type', ['M', 'C', 'F']).notNull(), path: varchar('path', { length: 255 }), component: varchar('component', { length: 255 }), permission: varchar('permission', { length: 255 }), icon: varchar('icon', { length: 100 }),
  sort: int('sort').default(0).notNull(), visible: boolean('visible').default(true).notNull(), cacheable: boolean('cacheable').default(false).notNull(), external: boolean('external').default(false).notNull(), status: mysqlEnum('status', ['active', 'disabled']).default('active').notNull(), ...auditColumns,
}, (table) => [uniqueIndex('uq_menu_permission').on(table.permission), index('idx_menu_parent').on(table.parentId)]);

export const userRoles = mysqlTable('sys_user_role', { userId: int('user_id', { unsigned: true }).notNull(), roleId: int('role_id', { unsigned: true }).notNull() }, (table) => [uniqueIndex('uq_user_role').on(table.userId, table.roleId), index('idx_user_role_role').on(table.roleId), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'fk_user_role_user' }).onDelete('cascade'), foreignKey({ columns: [table.roleId], foreignColumns: [roles.id], name: 'fk_user_role_role' }).onDelete('cascade')]);
export const roleMenus = mysqlTable('sys_role_menu', { roleId: int('role_id', { unsigned: true }).notNull(), menuId: int('menu_id', { unsigned: true }).notNull() }, (table) => [uniqueIndex('uq_role_menu').on(table.roleId, table.menuId), index('idx_role_menu_menu').on(table.menuId), foreignKey({ columns: [table.roleId], foreignColumns: [roles.id], name: 'fk_role_menu_role' }).onDelete('cascade'), foreignKey({ columns: [table.menuId], foreignColumns: [menus.id], name: 'fk_role_menu_menu' }).onDelete('cascade')]);
export const posts = mysqlTable('sys_post', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), name: varchar('name', { length: 50 }).notNull(), key: varchar('post_key', { length: 100 }).notNull(), sort: int('sort').default(0).notNull(),
  status: mysqlEnum('status', ['active', 'disabled']).default('active').notNull(), remark: varchar('remark', { length: 500 }), ...auditColumns,
}, (table) => [uniqueIndex('uq_post_key').on(table.key)]);
export const userPosts = mysqlTable('sys_user_post', { userId: int('user_id', { unsigned: true }).notNull(), postId: int('post_id', { unsigned: true }).notNull() }, (table) => [uniqueIndex('uq_user_post').on(table.userId, table.postId), index('idx_user_post_post').on(table.postId), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'fk_user_post_user' }).onDelete('cascade'), foreignKey({ columns: [table.postId], foreignColumns: [posts.id], name: 'fk_user_post_post' }).onDelete('cascade')]);
export const refreshTokens = mysqlTable('sys_refresh_token', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), userId: int('user_id', { unsigned: true }).notNull(), tokenHash: varchar('token_hash', { length: 255 }).notNull(), expiresAt: datetime('expires_at').notNull(), revokedAt: datetime('revoked_at'), device: varchar('device', { length: 255 }), ip: varchar('ip', { length: 45 }), createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [uniqueIndex('uq_refresh_token_hash').on(table.tokenHash), index('idx_refresh_user').on(table.userId), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'fk_refresh_token_user' }).onDelete('cascade')]);
export const dictionaries = mysqlTable('sys_dict_data', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), type: varchar('dict_type', { length: 100 }).notNull(), label: varchar('label', { length: 100 }).notNull(), value: varchar('value', { length: 100 }).notNull(), sort: int('sort').default(0).notNull(), status: mysqlEnum('status', ['active', 'disabled']).default('active').notNull(), cssClass: varchar('css_class', { length: 100 }), listClass: varchar('list_class', { length: 100 }), ...auditColumns,
}, (table) => [uniqueIndex('uq_dict_type_value').on(table.type, table.value)]);
export const dictTypes = mysqlTable('sys_dict_type', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), name: varchar('name', { length: 100 }).notNull(), type: varchar('type', { length: 100 }).notNull(), status: mysqlEnum('status', ['active', 'disabled']).default('active').notNull(), remark: varchar('remark', { length: 500 }), ...auditColumns,
}, (table) => [uniqueIndex('uq_dict_type').on(table.type)]);
export const configs = mysqlTable('sys_config', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), name: varchar('name', { length: 100 }).notNull(), key: varchar('config_key', { length: 100 }).notNull(), value: varchar('value', { length: 500 }).notNull(), builtin: boolean('builtin').default(false).notNull(), remark: varchar('remark', { length: 500 }), ...auditColumns,
}, (table) => [uniqueIndex('uq_config_key').on(table.key)]);
export const operationLogs = mysqlTable('sys_operation_log', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), userId: int('user_id', { unsigned: true }), title: varchar('title', { length: 100 }).notNull(), businessType: varchar('business_type', { length: 50 }).notNull(), method: varchar('method', { length: 255 }).notNull(), requestMethod: varchar('request_method', { length: 10 }).notNull(), url: varchar('url', { length: 500 }).notNull(), ip: varchar('ip', { length: 45 }), requestBody: json('request_body'), responseBody: json('response_body'), status: mysqlEnum('status', ['success', 'failure']).notNull(), errorMessage: varchar('error_message', { length: 2000 }), durationMs: int('duration_ms', { unsigned: true }).notNull(), createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [index('idx_operation_log_user_time').on(table.userId, table.createdAt), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'fk_operation_log_user' }).onDelete('set null')]);
export const loginLogs = mysqlTable('sys_login_log', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), userId: int('user_id', { unsigned: true }), username: varchar('username', { length: 64 }).notNull(), ip: varchar('ip', { length: 45 }), userAgent: varchar('user_agent', { length: 500 }),
  status: mysqlEnum('status', ['success', 'failure']).notNull(), message: varchar('message', { length: 500 }), createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [index('idx_login_log_user').on(table.userId), index('idx_login_log_time').on(table.createdAt), foreignKey({ columns: [table.userId], foreignColumns: [users.id], name: 'fk_login_log_user' }).onDelete('set null')]);
export const jobs = mysqlTable('sys_job', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), name: varchar('name', { length: 100 }).notNull(), handler: varchar('handler', { length: 255 }).notNull(), cron: varchar('cron', { length: 100 }).notNull(),
  status: mysqlEnum('status', ['active', 'disabled']).default('active').notNull(), concurrent: boolean('concurrent').default(true).notNull(), remark: varchar('remark', { length: 500 }), ...auditColumns,
}, (table) => [uniqueIndex('uq_job_handler').on(table.handler)]);
export const jobLogs = mysqlTable('sys_job_log', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), jobId: int('job_id', { unsigned: true }).notNull(), jobName: varchar('job_name', { length: 100 }).notNull(), handler: varchar('handler', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['success', 'failure']).notNull(), message: varchar('message', { length: 2000 }), startedAt: timestamp('started_at').notNull(), finishedAt: timestamp('finished_at').notNull(), durationMs: int('duration_ms', { unsigned: true }).notNull(),
}, (table) => [index('idx_job_log_job').on(table.jobId), foreignKey({ columns: [table.jobId], foreignColumns: [jobs.id], name: 'fk_job_log_job' }).onDelete('cascade')]);
export const files = mysqlTable('sys_file', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(), name: varchar('name', { length: 255 }).notNull(), originalName: varchar('original_name', { length: 255 }).notNull(), path: varchar('path', { length: 500 }).notNull(), mime: varchar('mime', { length: 100 }).notNull(),
  ext: varchar('ext', { length: 20 }).notNull(), size: int('size', { unsigned: true }).notNull(), createdBy: int('created_by', { unsigned: true }), createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [index('idx_file_created_by').on(table.createdBy), foreignKey({ columns: [table.createdBy], foreignColumns: [users.id], name: 'fk_file_created_by' }).onDelete('set null')]);

export const userRelations = relations(users, ({ one, many }) => ({ department: one(departments, { fields: [users.deptId], references: [departments.id] }), assignments: many(userRoles), refreshTokens: many(refreshTokens) }));
export const roleRelations = relations(roles, ({ many }) => ({ assignments: many(userRoles), menuAssignments: many(roleMenus) }));
export const userRoleRelations = relations(userRoles, ({ one }) => ({ user: one(users, { fields: [userRoles.userId], references: [users.id] }), role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }) }));
export const roleMenuRelations = relations(roleMenus, ({ one }) => ({ role: one(roles, { fields: [roleMenus.roleId], references: [roles.id] }), menu: one(menus, { fields: [roleMenus.menuId], references: [menus.id] }) }));
export const postRelations = relations(posts, ({ many }) => ({ assignments: many(userPosts) }));
export const userPostRelations = relations(userPosts, ({ one }) => ({ user: one(users, { fields: [userPosts.userId], references: [users.id] }), post: one(posts, { fields: [userPosts.postId], references: [posts.id] }) }));
