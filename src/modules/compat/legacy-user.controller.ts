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
import { UsersService } from '../system/users/users.service';
import { legacy, mapStatus } from './legacy';

type LegacyUserBody = {
  id?: number;
  userName?: string;
  nickName?: string;
  password?: string;
  roleId?: number;
  avatar?: string;
  status?: 0 | 1;
  email?: string;
  phone?: string;
};
type AuthRequest = { user: { id: number } };

@Controller('user')
export class LegacyUserController {
  constructor(private readonly users: UsersService) {}
  @Post('add')
  @RequirePermissions('system:user:create')
  async create(@Body() body: LegacyUserBody, @Req() request: AuthRequest) {
    const result = await this.users.create(
      {
        username: body.userName ?? '',
        displayName: body.nickName ?? '',
        password: body.password ?? '',
        email: body.email,
        phone: body.phone,
      },
      request.user.id,
    );
    if (body.roleId) await this.users.assignRole(result.id, body.roleId);
    return legacy(result, '创建成功');
  }
  @Post('setRole') @RequirePermissions('system:user:update') async setRole(
    @Body() body: { userId: number; roleId: number },
  ) {
    await this.users.assignRole(body.userId, body.roleId);
    return legacy(null, '设置成功');
  }
  @Get('list') @RequirePermissions('system:user:list') async list(
    @Query('pageNum') rawPage?: string,
    @Query('pageSize') rawPageSize?: string,
  ) {
    const page = Math.max(Number(rawPage) || 1, 1);
    const pageSize = Math.min(Math.max(Number(rawPageSize) || 20, 1), 100);
    return legacy(await this.users.list(page, pageSize));
  }
  @Put('edit') @RequirePermissions('system:user:update') async update(
    @Body() body: LegacyUserBody,
    @Req() request: AuthRequest,
  ) {
    if (!body.id) throw new BadRequestException('id is required');
    await this.users.update(
      body.id,
      {
        displayName: body.nickName,
        email: body.email ?? null,
        phone: body.phone ?? null,
        status: body.status === undefined ? undefined : mapStatus(body.status),
      },
      request.user.id,
    );
    return legacy(null, '修改成功');
  }
  @Delete('del') @RequirePermissions('system:user:delete') async remove(
    @Query('id') rawId: string,
    @Req() request: AuthRequest,
  ) {
    await this.users.remove(Number(rawId), request.user.id);
    return legacy(null, '删除成功');
  }
}
