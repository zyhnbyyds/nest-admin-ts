import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/permissions.decorator.js';
import { MenusService } from '../system/menus/menus.service.js';
import { legacy, mapMenuType } from './legacy.js';

type LegacyMenuBody = {
  id?: number;
  parentId?: number;
  name?: string;
  title?: string;
  type?: string;
  path?: string;
  component?: string;
  permission?: string;
  apiPerms?: string;
  icon?: string;
  order?: number;
  sort?: number;
};
type AuthRequest = { user: { id: number } };

@Controller('menu')
export class LegacyMenuController {
  constructor(private readonly menus: MenusService) {}
  @Post('list') @RequirePermissions('system:menu:list') async list() {
    const tree = await this.menus.list();
    return legacy({ routes: tree, home: 'dashboard_analysis' });
  }
  @Post('add') @RequirePermissions('system:menu:create') async create(
    @Body() body: LegacyMenuBody,
    @Req() request: AuthRequest,
  ) {
    await this.menus.create(this.map(body), request.user.id);
    return legacy(null, '创建成功');
  }
  @Get(':id') @RequirePermissions('system:menu:list') async findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return legacy(await this.menus.findOne(id));
  }
  @Put('edit') @RequirePermissions('system:menu:update') async update(
    @Body() body: LegacyMenuBody,
    @Req() request: AuthRequest,
  ) {
    if (!body.id) throw new BadRequestException('id is required');
    await this.menus.update(body.id, this.map(body), request.user.id);
    return legacy(null, '修改成功');
  }
  @Delete('del') @RequirePermissions('system:menu:delete') async remove(
    @Query('id') rawId: string,
    @Req() request: AuthRequest,
  ) {
    await this.menus.remove(Number(rawId), request.user.id);
    return legacy(null, '删除成功');
  }
  private map(body: LegacyMenuBody) {
    return {
      parentId: body.parentId ?? 0,
      name: body.name ?? '',
      title: body.title ?? '',
      type: mapMenuType(body.type),
      path: body.path,
      component: body.component,
      permission: body.permission ?? body.apiPerms,
      icon: body.icon,
      sort: body.order ?? body.sort ?? 0,
    };
  }
}
