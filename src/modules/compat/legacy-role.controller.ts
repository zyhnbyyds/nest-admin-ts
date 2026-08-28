import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { RolesService } from '../system/roles/roles.service';
import { legacy, mapStatus, slugify } from './legacy';

type LegacyRoleBody = {
  id?: number;
  roleName?: string;
  nickName?: string;
  key?: string;
  checkedKeys?: number[];
  authList?: number[];
  roleId?: number;
  status?: 0 | 1;
};
type AuthRequest = { user: { id: number } };

@Controller('role')
export class LegacyRoleController {
  constructor(private readonly roles: RolesService) {}
  @Post('add')
  @RequirePermissions('system:role:create')
  async create(@Body() body: LegacyRoleBody, @Req() request: AuthRequest) {
    const key = body.key ?? body.nickName ?? slugify(body.roleName ?? 'role');
    const result = await this.roles.create(
      {
        name: body.roleName ?? body.nickName ?? '',
        key,
        menuIds: body.checkedKeys ?? [],
      },
      request.user.id,
    );
    return legacy(result, '创建成功');
  }
  @Get('list') @RequirePermissions('system:role:list') async list() {
    return legacy(await this.roles.list());
  }
  @Put('edit') @RequirePermissions('system:role:update') async update(
    @Body() body: LegacyRoleBody,
    @Req() request: AuthRequest,
  ) {
    if (!body.id) throw new BadRequestException('id is required');
    await this.roles.update(
      body.id,
      {
        name: body.roleName,
        status: body.status === undefined ? undefined : mapStatus(body.status),
      },
      request.user.id,
    );
    return legacy(null, '修改成功');
  }
  @Delete('del') @RequirePermissions('system:role:delete') async remove(
    @Query('id') rawId: string,
    @Req() request: AuthRequest,
  ) {
    await this.roles.remove(Number(rawId), request.user.id);
    return legacy(null, '删除成功');
  }
  @Post('addAuth') @RequirePermissions('system:role:update') async addAuth(
    @Body() body: LegacyRoleBody,
  ) {
    await this.roles.setMenus(body.roleId ?? 0, body.authList ?? []);
    return legacy(null, '设置成功');
  }
  @Post('auth/list') @RequirePermissions('system:role:list') async authList(
    @Body() body: LegacyRoleBody,
  ) {
    return legacy(await this.roles.getMenuIds(body.roleId ?? 0));
  }
}
