import { Module, OnModuleInit } from '@nestjs/common';
import { DashboardModule } from '../modules/dashboard/dashboard.module';
import { FilesModule } from '../modules/files/files.module';
import { JobsModule } from '../modules/jobs/jobs.module';
import { CacheModule } from '../modules/monitor/cache/cache.module';
import { LoginLogsModule } from '../modules/monitor/login-logs/login-logs.module';
import { OnlineModule } from '../modules/monitor/online/online.module';
import { OperationLogsModule } from '../modules/monitor/operation-logs/operation-logs.module';
import { ConfigsModule } from '../modules/system/configs/configs.module';
import { DeptsModule } from '../modules/system/depts/depts.module';
import { DictDataModule } from '../modules/system/dict-data/dict-data.module';
import { DictTypesModule } from '../modules/system/dict-types/dict-types.module';
import { MenusModule } from '../modules/system/menus/menus.module';
import { PostsModule } from '../modules/system/posts/posts.module';
import { RolesModule } from '../modules/system/roles/roles.module';
import { UsersModule } from '../modules/system/users/users.module';
import { AgentService } from './agent/agent.service';
import { ActionIntentService } from './approval/action-intent.service';
import { ApprovalService } from './approval/approval.service';
import { AuditService } from './audit/audit.service';
import { CapabilityService } from './capability/capability.service';
import { ContextBuilder } from './context/context.builder';
import { ContextSanitizer } from './context/context.sanitizer';
import { AiGatewayController } from './gateway/ai.gateway.controller';
import { AiGatewayService } from './gateway/ai.gateway.service';
import { LlmService } from './llm/llm.service';
import { PermissionService } from './policy/permission.service';
import { PolicyEngine } from './policy/policy.engine';
import { RiskEngine } from './risk/risk.engine';
import { TaskService } from './task/task.service';
import { AiTool } from './tools/tool.interface';
import { ToolExecutor } from './tools/tool.executor';
import { ToolRegistry } from './tools/tool.registry';
import { CacheInfoTool } from './tools/cache/cache.tools';
import {
  ConfigCreateTool,
  ConfigGetTool,
  ConfigListTool,
  ConfigRemoveTool,
  ConfigUpdateTool,
} from './tools/configs/configs.tools';
import {
  DashboardDeptsTool,
  DashboardMenusTool,
  DashboardPostsTool,
  DashboardRolesTool,
  DashboardUsersTool,
} from './tools/dashboard/dashboard.tools';
import {
  DeptCreateTool,
  DeptGetTool,
  DeptListTool,
  DeptRemoveTool,
  DeptUpdateTool,
} from './tools/depts/depts.tools';
import {
  DictDataCreateTool,
  DictDataGetTool,
  DictDataListTool,
  DictDataRemoveTool,
  DictDataUpdateTool,
} from './tools/dict-data/dict-data.tools';
import {
  DictTypeCreateTool,
  DictTypeGetTool,
  DictTypeListTool,
  DictTypeRemoveTool,
  DictTypeUpdateTool,
} from './tools/dict-types/dict-types.tools';
import {
  FileGetTool,
  FileListTool,
  FileRemoveTool,
} from './tools/files/files.tools';
import {
  JobClearLogsTool,
  JobCreateTool,
  JobGetTool,
  JobListTool,
  JobLogsTool,
  JobRemoveTool,
  JobRunTool,
  JobUpdateTool,
} from './tools/jobs/jobs.tools';
import {
  LoginLogClearTool,
  LoginLogGetTool,
  LoginLogListTool,
  LoginLogRemoveTool,
} from './tools/login-logs/login-logs.tools';
import {
  MenuCreateTool,
  MenuGetTool,
  MenuListTool,
  MenuRemoveTool,
  MenuUpdateTool,
} from './tools/menus/menus.tools';
import {
  OnlineForceLogoutTool,
  OnlineListTool,
} from './tools/online/online.tools';
import {
  OperationLogClearTool,
  OperationLogGetTool,
  OperationLogListTool,
  OperationLogRemoveTool,
} from './tools/operation-logs/operation-logs.tools';
import {
  PostCreateTool,
  PostGetTool,
  PostListTool,
  PostRemoveTool,
  PostUpdateTool,
} from './tools/posts/posts.tools';
import {
  RoleCreateTool,
  RoleGetTool,
  RoleListTool,
  RoleRemoveTool,
  RoleUpdateTool,
} from './tools/roles/roles.tools';
import { UserCreateTool } from './tools/user/user.create.tool';
import { UserGetTool } from './tools/user/user.get.tool';
import { UserListTool } from './tools/user/user.list.tool';
import { UserUpdateTool } from './tools/user/user.update.tool';

/**
 * AI Operations Layer 模块。
 *
 * 核心原则：AI 不直接访问数据库，所有操作必须经过 Tool → Service → Prisma。
 */
@Module({
  imports: [
    UsersModule,
    RolesModule,
    DeptsModule,
    MenusModule,
    PostsModule,
    ConfigsModule,
    DictTypesModule,
    DictDataModule,
    LoginLogsModule,
    OperationLogsModule,
    OnlineModule,
    CacheModule,
    JobsModule,
    FilesModule,
    DashboardModule,
  ],
  controllers: [AiGatewayController],
  providers: [
    LlmService,
    ToolRegistry,
    ToolExecutor,
    CapabilityService,
    PermissionService,
    RiskEngine,
    PolicyEngine,
    ContextBuilder,
    ContextSanitizer,
    AuditService,
    ActionIntentService,
    ApprovalService,
    TaskService,
    AgentService,
    AiGatewayService,
    // 用户
    UserListTool,
    UserGetTool,
    UserCreateTool,
    UserUpdateTool,
    // 角色
    RoleListTool,
    RoleGetTool,
    RoleCreateTool,
    RoleUpdateTool,
    RoleRemoveTool,
    // 部门
    DeptListTool,
    DeptGetTool,
    DeptCreateTool,
    DeptUpdateTool,
    DeptRemoveTool,
    // 菜单
    MenuListTool,
    MenuGetTool,
    MenuCreateTool,
    MenuUpdateTool,
    MenuRemoveTool,
    // 岗位
    PostListTool,
    PostGetTool,
    PostCreateTool,
    PostUpdateTool,
    PostRemoveTool,
    // 参数配置
    ConfigListTool,
    ConfigGetTool,
    ConfigCreateTool,
    ConfigUpdateTool,
    ConfigRemoveTool,
    // 字典类型
    DictTypeListTool,
    DictTypeGetTool,
    DictTypeCreateTool,
    DictTypeUpdateTool,
    DictTypeRemoveTool,
    // 字典数据
    DictDataListTool,
    DictDataGetTool,
    DictDataCreateTool,
    DictDataUpdateTool,
    DictDataRemoveTool,
    // 登录日志
    LoginLogListTool,
    LoginLogGetTool,
    LoginLogRemoveTool,
    LoginLogClearTool,
    // 操作日志
    OperationLogListTool,
    OperationLogGetTool,
    OperationLogRemoveTool,
    OperationLogClearTool,
    // 在线用户
    OnlineListTool,
    OnlineForceLogoutTool,
    // 缓存监控
    CacheInfoTool,
    // 定时任务
    JobListTool,
    JobGetTool,
    JobCreateTool,
    JobUpdateTool,
    JobRemoveTool,
    JobRunTool,
    JobLogsTool,
    JobClearLogsTool,
    // 文件
    FileListTool,
    FileGetTool,
    FileRemoveTool,
    // 首页统计
    DashboardUsersTool,
    DashboardDeptsTool,
    DashboardRolesTool,
    DashboardMenusTool,
    DashboardPostsTool,
  ],
  exports: [AiGatewayService],
})
export class AiModule implements OnModuleInit {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly userListTool: UserListTool,
    private readonly userGetTool: UserGetTool,
    private readonly userCreateTool: UserCreateTool,
    private readonly userUpdateTool: UserUpdateTool,
    private readonly roleListTool: RoleListTool,
    private readonly roleGetTool: RoleGetTool,
    private readonly roleCreateTool: RoleCreateTool,
    private readonly roleUpdateTool: RoleUpdateTool,
    private readonly roleRemoveTool: RoleRemoveTool,
    private readonly deptListTool: DeptListTool,
    private readonly deptGetTool: DeptGetTool,
    private readonly deptCreateTool: DeptCreateTool,
    private readonly deptUpdateTool: DeptUpdateTool,
    private readonly deptRemoveTool: DeptRemoveTool,
    private readonly menuListTool: MenuListTool,
    private readonly menuGetTool: MenuGetTool,
    private readonly menuCreateTool: MenuCreateTool,
    private readonly menuUpdateTool: MenuUpdateTool,
    private readonly menuRemoveTool: MenuRemoveTool,
    private readonly postListTool: PostListTool,
    private readonly postGetTool: PostGetTool,
    private readonly postCreateTool: PostCreateTool,
    private readonly postUpdateTool: PostUpdateTool,
    private readonly postRemoveTool: PostRemoveTool,
    private readonly configListTool: ConfigListTool,
    private readonly configGetTool: ConfigGetTool,
    private readonly configCreateTool: ConfigCreateTool,
    private readonly configUpdateTool: ConfigUpdateTool,
    private readonly configRemoveTool: ConfigRemoveTool,
    private readonly dictTypeListTool: DictTypeListTool,
    private readonly dictTypeGetTool: DictTypeGetTool,
    private readonly dictTypeCreateTool: DictTypeCreateTool,
    private readonly dictTypeUpdateTool: DictTypeUpdateTool,
    private readonly dictTypeRemoveTool: DictTypeRemoveTool,
    private readonly dictDataListTool: DictDataListTool,
    private readonly dictDataGetTool: DictDataGetTool,
    private readonly dictDataCreateTool: DictDataCreateTool,
    private readonly dictDataUpdateTool: DictDataUpdateTool,
    private readonly dictDataRemoveTool: DictDataRemoveTool,
    private readonly loginLogListTool: LoginLogListTool,
    private readonly loginLogGetTool: LoginLogGetTool,
    private readonly loginLogRemoveTool: LoginLogRemoveTool,
    private readonly loginLogClearTool: LoginLogClearTool,
    private readonly operationLogListTool: OperationLogListTool,
    private readonly operationLogGetTool: OperationLogGetTool,
    private readonly operationLogRemoveTool: OperationLogRemoveTool,
    private readonly operationLogClearTool: OperationLogClearTool,
    private readonly onlineListTool: OnlineListTool,
    private readonly onlineForceLogoutTool: OnlineForceLogoutTool,
    private readonly cacheInfoTool: CacheInfoTool,
    private readonly jobListTool: JobListTool,
    private readonly jobGetTool: JobGetTool,
    private readonly jobCreateTool: JobCreateTool,
    private readonly jobUpdateTool: JobUpdateTool,
    private readonly jobRemoveTool: JobRemoveTool,
    private readonly jobRunTool: JobRunTool,
    private readonly jobLogsTool: JobLogsTool,
    private readonly jobClearLogsTool: JobClearLogsTool,
    private readonly fileListTool: FileListTool,
    private readonly fileGetTool: FileGetTool,
    private readonly fileRemoveTool: FileRemoveTool,
    private readonly dashboardUsersTool: DashboardUsersTool,
    private readonly dashboardDeptsTool: DashboardDeptsTool,
    private readonly dashboardRolesTool: DashboardRolesTool,
    private readonly dashboardMenusTool: DashboardMenusTool,
    private readonly dashboardPostsTool: DashboardPostsTool,
  ) {}

  onModuleInit(): void {
    const tools: AiTool[] = [
      this.userListTool,
      this.userGetTool,
      this.userCreateTool,
      this.userUpdateTool,
      this.roleListTool,
      this.roleGetTool,
      this.roleCreateTool,
      this.roleUpdateTool,
      this.roleRemoveTool,
      this.deptListTool,
      this.deptGetTool,
      this.deptCreateTool,
      this.deptUpdateTool,
      this.deptRemoveTool,
      this.menuListTool,
      this.menuGetTool,
      this.menuCreateTool,
      this.menuUpdateTool,
      this.menuRemoveTool,
      this.postListTool,
      this.postGetTool,
      this.postCreateTool,
      this.postUpdateTool,
      this.postRemoveTool,
      this.configListTool,
      this.configGetTool,
      this.configCreateTool,
      this.configUpdateTool,
      this.configRemoveTool,
      this.dictTypeListTool,
      this.dictTypeGetTool,
      this.dictTypeCreateTool,
      this.dictTypeUpdateTool,
      this.dictTypeRemoveTool,
      this.dictDataListTool,
      this.dictDataGetTool,
      this.dictDataCreateTool,
      this.dictDataUpdateTool,
      this.dictDataRemoveTool,
      this.loginLogListTool,
      this.loginLogGetTool,
      this.loginLogRemoveTool,
      this.loginLogClearTool,
      this.operationLogListTool,
      this.operationLogGetTool,
      this.operationLogRemoveTool,
      this.operationLogClearTool,
      this.onlineListTool,
      this.onlineForceLogoutTool,
      this.cacheInfoTool,
      this.jobListTool,
      this.jobGetTool,
      this.jobCreateTool,
      this.jobUpdateTool,
      this.jobRemoveTool,
      this.jobRunTool,
      this.jobLogsTool,
      this.jobClearLogsTool,
      this.fileListTool,
      this.fileGetTool,
      this.fileRemoveTool,
      this.dashboardUsersTool,
      this.dashboardDeptsTool,
      this.dashboardRolesTool,
      this.dashboardMenusTool,
      this.dashboardPostsTool,
    ];
    for (const tool of tools) {
      this.registry.register(tool);
    }
  }
}
