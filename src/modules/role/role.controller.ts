import { SearchQuery } from 'src/common/common.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Query,
  Req,
  UseGuards,
  Put,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/role.guard';
import { Roles } from 'src/decorators/roles.decorator';

@Controller('role')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Roles('role:add')
  @Post('/add')
  create(@Body() createRoleDto: CreateRoleDto, @Req() req: any) {
    return this.roleService.create(createRoleDto, req);
  }

  @Roles('role:check')
  @Get('/list')
  findAll(@Query() searchQuery: SearchQuery) {
    return this.roleService.findAll(searchQuery);
  }

  @Roles('role:edit')
  @Put('/edit')
  update(@Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(updateRoleDto);
  }

  @Roles('role:del')
  @Delete('/del')
  remove(@Query() delQuery: { id: number }) {
    return this.roleService.remove(delQuery.id);
  }

  @Post('/addAuth')
  roleSetAuth(@Body() roleAddAuthDto: { roleId: number; authList: number[] }) {
    return this.roleService.roleSetAuth(
      roleAddAuthDto.roleId,
      roleAddAuthDto.authList,
    );
  }

  @Post('/auth/list')
  getAuthList(@Body() getRoleListDto: { roleId: number }) {
    return this.roleService.getAuthList(getRoleListDto.roleId);
  }

  @Get('/menu/list')
  getMenuList(@Req() req: any) {
    return this.roleService.getMenuList(req.user.roleId);
  }
}
