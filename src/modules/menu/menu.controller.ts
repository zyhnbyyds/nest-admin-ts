import { Roles } from 'src/decorators/roles.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  Put,
  Query,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/guards/role.guard';

@Controller('menu')
@Roles('menu')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Roles('menu:add')
  @Post('/add')
  @HttpCode(200)
  create(@Body() createMenuDto: CreateMenuDto, @Req() req: any) {
    return this.menuService.create(createMenuDto, req.user.userName);
  }

  @Roles('menu:check')
  @Post('/list')
  @HttpCode(200)
  findAll() {
    return this.menuService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(+id);
  }

  @Roles('menu:edit')
  @Put('/edit')
  update(@Body() updateMenuDto: UpdateMenuDto, @Req() req: any) {
    return this.menuService.update(updateMenuDto, req.user.userName);
  }

  @Roles('menu:del')
  @Delete('/del')
  @HttpCode(200)
  remove(@Query('id') id: number) {
    return this.menuService.remove(id);
  }
}
