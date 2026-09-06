import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('首页统计')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('users')
  @RequirePermissions('system:user:list')
  @ApiOperation({ summary: '用户统计（总数/启用/禁用/今日新增）' })
  @ApiResponse({ status: 200, description: '成功' })
  users() {
    return this.dashboard.users();
  }

  @Get('depts')
  @RequirePermissions('system:dept:list')
  @ApiOperation({ summary: '部门统计' })
  @ApiResponse({ status: 200, description: '成功' })
  depts() {
    return this.dashboard.depts();
  }

  @Get('roles')
  @RequirePermissions('system:role:list')
  @ApiOperation({ summary: '角色统计' })
  @ApiResponse({ status: 200, description: '成功' })
  roles() {
    return this.dashboard.roles();
  }

  @Get('menus')
  @RequirePermissions('system:menu:list')
  @ApiOperation({ summary: '菜单统计（总数/目录/菜单/按钮）' })
  @ApiResponse({ status: 200, description: '成功' })
  menus() {
    return this.dashboard.menus();
  }

  @Get('posts')
  @RequirePermissions('system:post:list')
  @ApiOperation({ summary: '岗位统计' })
  @ApiResponse({ status: 200, description: '成功' })
  posts() {
    return this.dashboard.posts();
  }
}
