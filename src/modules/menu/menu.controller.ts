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

@Controller('menu')
@UseGuards(AuthGuard('jwt'))
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post('/add')
  @HttpCode(200)
  create(@Body() createMenuDto: CreateMenuDto, @Req() req: any) {
    return this.menuService.create(createMenuDto, req.user.userName);
  }

  @Post('/list')
  @HttpCode(200)
  findAll() {
    return this.menuService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(+id);
  }

  @Put('/edit')
  update(@Body() updateMenuDto: UpdateMenuDto, @Req() req: any) {
    return this.menuService.update(updateMenuDto, req.user.userName);
  }

  @Delete('/delete')
  @HttpCode(200)
  remove(@Query('id') id: number) {
    return this.menuService.remove(id);
  }
}
