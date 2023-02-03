import { SearchQuery } from 'src/common/common.dto';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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

@Controller('role')
@UseGuards(AuthGuard('jwt'))
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(@Body() createRoleDto: CreateRoleDto, @Req() req: any) {
    return this.roleService.create(createRoleDto, req);
  }

  @Get('/list')
  findAll(@Query() searchQuery: SearchQuery) {
    return this.roleService.findAll(searchQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id);
  }

  @Put('/edit')
  update(@Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(updateRoleDto);
  }

  @Delete('/del')
  remove(@Query() delQuery: { id: number }) {
    return this.roleService.remove(delQuery.id);
  }
}
