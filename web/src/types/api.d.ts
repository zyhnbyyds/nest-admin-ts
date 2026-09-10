/** 后端统一分页响应（无 total 字段） */
export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
}

/** 分页请求参数 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export type EntityStatus = "active" | "disabled";

export interface TimestampFields {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ============ auth ============

export interface LoginBody {
  username: string;
  password: string;
}

export interface RegisterBody {
  username: string;
  displayName: string;
  password: string;
  email?: string;
  phone?: string;
}

export interface UpdateProfileBody {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  /** 头像地址；传 null 表示移除头像 */
  avatar?: string | null;
}

export interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

/** JWT access token payload */
export interface JwtPayload {
  sub: number;
  username: string;
  roles: string[];
  permissions: string[];
  exp: number;
  iat: number;
  iss: string;
  aud: string;
}

// ============ users ============

export interface User {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: EntityStatus;
  deptId: number | null;
  /** 部门名称（列表查询时联查返回） */
  deptName?: string | null;
  /** 头像地址（站内文件相对路径或 http(s) 链接） */
  avatar?: string | null;
  createdAt: string;
  loginAt: string | null;
  roleIds?: number[];
  roleNames?: string[];
}

/** GET /auth/profile 返回的当前用户资料 */
export interface Profile {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  deptId: number | null;
  createdAt: string;
  loginAt: string | null;
}

export interface CreateUserBody {
  username: string;
  displayName: string;
  password: string;
  email?: string;
  phone?: string;
  deptId?: number;
  roleIds?: number[];
}

export interface UpdateUserBody {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  deptId?: number | null;
  status?: EntityStatus;
  password?: string;
  roleIds?: number[];
}

// ============ ai ============

export interface AiSession {
  id: number;
  userId: number;
  title: string;
  status: "active" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface AiToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

/** 审批结果元数据：存于收尾 assistant 消息的 toolResults[0]（持久化，刷新后仍可还原结果条） */
export interface AiApprovalResult {
  type: "approval_result";
  outcome: "success" | "cancelled" | "error";
  toolName?: string;
}

export interface AiMessage {
  id: number;
  sessionId: number;
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  toolCalls: AiToolCall[] | null;
  /** 附加结果元数据：审批收尾消息为 [AiApprovalResult]，持久化于 toolResults 列 */
  toolResults: unknown[] | null;
  createdAt: string;
  /** 前端本地标记：本条为「生成中」消息（打字机动画 + 实时 tool 步骤），不持久化 */
  _fresh?: boolean;
}

export interface AiResult {
  content: string;
  toolCalls: AiToolCall[];
  waitingApproval: boolean;
  riskLevel: "L0" | "L1" | "L2" | "L3";
}

export interface AiSseEvent {
  type: string;
  data: unknown;
}

export interface AiApprovalPreview {
  summary: string;
  affectedCount: number;
  before?: unknown;
  after?: unknown;
  undoable?: boolean;
}

export interface AiApprovalRequired {
  intentId: number;
  confirmToken: string;
  toolName: string;
  input: Record<string, unknown>;
  riskLevel: "L0" | "L1" | "L2" | "L3";
  preview?: AiApprovalPreview;
}

export interface AiTaskStep {
  id: number;
  taskId: number;
  stepIndex: number;
  toolName: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED" | "WAITING_APPROVAL";
  input?: unknown;
  output?: unknown;
  riskLevel: string;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface AiTaskInfo {
  id: number;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
  riskLevel: string;
  goal: string;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
  steps?: AiTaskStep[];
}

export interface AiTaskSseEvent {
  type: "task_created" | "task_step" | "task_completed";
  data: {
    taskId: number;
    goal?: string;
    stepCount?: number;
    index?: number;
    toolName?: string;
    status?: string;
    result?: unknown;
    error?: string;
  };
}

// ============ roles ============

export type DataScope = "all" | "custom" | "dept" | "dept_and_children" | "self";

export interface Role {
  id: number;
  name: string;
  key: string;
  sort: number;
  dataScope: DataScope;
  /** 自定义数据范围（dataScope=custom）时可见的部门ID集合 */
  deptIds?: number[];
  isSystem: boolean;
  status: EntityStatus;
  remark: string | null;
  createdAt: string;
}

export interface CreateRoleBody {
  name: string;
  key: string;
  sort?: number;
  dataScope?: DataScope;
  menuIds?: number[];
  deptIds?: number[];
  remark?: string;
}

export interface UpdateRoleBody {
  name?: string;
  key?: string;
  sort?: number;
  dataScope?: DataScope;
  status?: EntityStatus;
  remark?: string | null;
  deptIds?: number[];
}

export interface AssignRoleMenusBody {
  menuIds: number[];
}

// ============ menus ============

export type MenuType = "M" | "C" | "F";

export interface Menu {
  id: number;
  parentId: number;
  name: string;
  title: string;
  type: MenuType;
  path: string | null;
  component: string | null;
  permission: string | null;
  icon: string | null;
  sort: number;
  visible: boolean;
  cacheable: boolean;
  external: boolean;
  status: EntityStatus;
  children?: Menu[];
}

/** GET /system/menus/routes 返回的动态路由节点 */
export interface RouteNode {
  id: number;
  parentId: number;
  name: string;
  path: string | null;
  component: string | null;
  permission: string | null;
  type: MenuType;
  meta: {
    title: string;
    icon: string | null;
    sort: number;
    cacheable: boolean;
    external: boolean;
    visible: boolean;
  };
  children: RouteNode[];
}

export interface CreateMenuBody {
  parentId?: number;
  name: string;
  title: string;
  type: MenuType;
  path?: string;
  component?: string;
  permission?: string;
  icon?: string;
  sort?: number;
  visible?: boolean;
  cacheable?: boolean;
  external?: boolean;
  status?: EntityStatus;
}

export type UpdateMenuBody = Partial<CreateMenuBody>;

// ============ depts ============

export interface Dept {
  id: number;
  parentId: number;
  name: string;
  sort: number;
  phone: string | null;
  email: string | null;
  status: EntityStatus;
  children?: Dept[];
}

export interface CreateDeptBody {
  parentId?: number;
  name: string;
  sort?: number;
  phone?: string;
  email?: string;
  status?: EntityStatus;
}

export type UpdateDeptBody = Partial<CreateDeptBody>;

// ============ posts ============

export interface Post {
  id: number;
  name: string;
  key: string;
  sort: number;
  status: EntityStatus;
  remark: string | null;
  createdAt: string;
}

export interface CreatePostBody {
  name: string;
  key: string;
  sort?: number;
  status?: EntityStatus;
  remark?: string;
}

export type UpdatePostBody = Partial<CreatePostBody>;

// ============ dict ============

export interface DictType {
  id: number;
  name: string;
  type: string;
  status: EntityStatus;
  remark: string | null;
  createdAt: string;
}

export interface CreateDictTypeBody {
  name: string;
  type: string;
  status?: EntityStatus;
  remark?: string;
}

export type UpdateDictTypeBody = Partial<CreateDictTypeBody>;

export interface DictData {
  id: number;
  type: string;
  label: string;
  value: string;
  sort: number;
  status: EntityStatus;
  cssClass: string | null;
  listClass: string | null;
  createdAt: string;
}

export interface CreateDictDataBody {
  type: string;
  label: string;
  value: string;
  sort?: number;
  status?: EntityStatus;
  cssClass?: string;
  listClass?: string;
}

export type UpdateDictDataBody = Partial<CreateDictDataBody>;

// ============ configs ============

export interface Config {
  id: number;
  name: string;
  key: string;
  value: string;
  builtin: boolean;
  remark: string | null;
  createdAt: string;
}

export interface CreateConfigBody {
  name: string;
  key: string;
  value: string;
  builtin?: boolean;
  remark?: string;
}

export type UpdateConfigBody = Partial<CreateConfigBody>;

// ============ monitor ============

export interface LoginLog {
  id: number;
  userId: number | null;
  username: string;
  ip: string | null;
  userAgent: string | null;
  status: "success" | "failed";
  message: string | null;
  createdAt: string;
}

export interface OperationLog {
  id: number;
  userId: number | null;
  /** 操作人用户名（列表联查 users 返回） */
  username: string | null;
  /** 模块.操作（如 UsersController.create） */
  title: string;
  businessType: "insert" | "update" | "delete" | "other";
  method: string;
  /** HTTP 方法 */
  requestMethod: string;
  url: string;
  ip: string | null;
  requestBody: unknown | null;
  responseBody: unknown | null;
  status: "success" | "failure";
  errorMessage: string | null;
  durationMs: number;
  createdAt: string;
}

export interface OnlineSession {
  userId: number;
  username: string;
  ip: string | null;
  userAgent: string | null;
  loginAt: string;
}

export interface CacheInfo {
  enabled: boolean;
  connected: boolean;
  dbsize: number;
}

// ============ jobs ============

export interface Job {
  id: number;
  name: string;
  handler: string;
  cron: string;
  status: EntityStatus;
  concurrent: boolean;
  remark: string | null;
  createdAt: string;
}

export interface CreateJobBody {
  name: string;
  handler: string;
  cron: string;
  status?: EntityStatus;
  concurrent?: boolean;
  remark?: string;
}

export type UpdateJobBody = Partial<CreateJobBody>;

export interface JobLog {
  id: number;
  jobId: number;
  startedAt: string;
  finishedAt: string | null;
  status: "success" | "failed" | "running";
  error: string | null;
}

// ============ files ============

export interface FileItem {
  id: number;
  name: string;
  originalName: string;
  url: string;
  mime: string;
  ext: string;
  size: number;
  createdAt: string;
}

// ============ generator ============

/** 数据库表字段信息（GET /generator/tables/:table/columns） */
export interface ColumnMeta {
  name: string;
  dataType: string;
  columnType: string;
  nullable: string;
  columnKey: string;
  defaultValue: string | null;
  extra: string;
  comment: string;
}

// ============ dashboard 首页统计 ============

/** 用户统计（GET /dashboard/users） */
export interface UserStats {
  total: number;
  active: number;
  disabled: number;
  /** 今日新增（东八区日界） */
  todayNew: number;
}

/** 启/停用状态统计（GET /dashboard/depts | /dashboard/roles | /dashboard/posts） */
export interface StatusStats {
  total: number;
  active: number;
  disabled: number;
}

/** 菜单统计（GET /dashboard/menus） */
export interface MenuStats {
  total: number;
  /** 目录（M） */
  directory: number;
  /** 菜单（C） */
  menu: number;
  /** 按钮（F） */
  button: number;
}
