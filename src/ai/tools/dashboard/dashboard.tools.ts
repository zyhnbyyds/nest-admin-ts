import { Injectable } from '@nestjs/common';
import { ApprovalPolicy, RiskLevel } from '../../ai.types';
import { BaseCrudTool } from '../base/base-crud.tool';
import { DashboardService } from '../../../modules/dashboard/dashboard.service';

/** dashboard.users Tool：用户统计 */
@Injectable()
export class DashboardUsersTool extends BaseCrudTool<DashboardService> {
  name = 'dashboard.users';
  description = '查询用户统计：总数、启用、禁用、今日新增。';
  permission = 'system:user:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: DashboardService) {
    super(service);
  }

  protected override async doList() {
    return this.service.users();
  }
}

/** dashboard.depts Tool：部门统计 */
@Injectable()
export class DashboardDeptsTool extends BaseCrudTool<DashboardService> {
  name = 'dashboard.depts';
  description = '查询部门统计：总数、启用、禁用。';
  permission = 'system:dept:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: DashboardService) {
    super(service);
  }

  protected override async doList() {
    return this.service.depts();
  }
}

/** dashboard.roles Tool：角色统计 */
@Injectable()
export class DashboardRolesTool extends BaseCrudTool<DashboardService> {
  name = 'dashboard.roles';
  description = '查询角色统计：总数、启用、禁用。';
  permission = 'system:role:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: DashboardService) {
    super(service);
  }

  protected override async doList() {
    return this.service.roles();
  }
}

/** dashboard.menus Tool：菜单统计 */
@Injectable()
export class DashboardMenusTool extends BaseCrudTool<DashboardService> {
  name = 'dashboard.menus';
  description = '查询菜单统计：总数、目录、菜单、按钮。';
  permission = 'system:menu:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: DashboardService) {
    super(service);
  }

  protected override async doList() {
    return this.service.menus();
  }
}

/** dashboard.posts Tool：岗位统计 */
@Injectable()
export class DashboardPostsTool extends BaseCrudTool<DashboardService> {
  name = 'dashboard.posts';
  description = '查询岗位统计：总数、启用、禁用。';
  permission = 'system:post:list';
  riskLevel = RiskLevel.L0;
  approvalPolicy = ApprovalPolicy.NONE;
  inputSchema = { type: 'object', properties: {} };
  action = 'list' as const;

  constructor(service: DashboardService) {
    super(service);
  }

  protected override async doList() {
    return this.service.posts();
  }
}
