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
}

export interface UpdateUserBody {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  deptId?: number | null;
  status?: EntityStatus;
}

// ============ roles ============

export type DataScope = "all" | "custom" | "dept" | "dept_and_children" | "self";

export interface Role {
  id: number;
  name: string;
  key: string;
  sort: number;
  dataScope: DataScope;
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
  remark?: string;
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
  leaderUserId: number | null;
  phone: string | null;
  email: string | null;
  status: EntityStatus;
  children?: Dept[];
}

export interface CreateDeptBody {
  parentId?: number;
  name: string;
  sort?: number;
  leaderUserId?: number;
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
  username: string | null;
  module: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
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
