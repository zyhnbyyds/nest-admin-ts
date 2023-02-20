import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Query,
  UseGuards,
  Req,
  Put,
  HttpCode,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, AddUserRoleDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchQuery } from 'src/common/common.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/decorators/roles.decorator';
import { RolesGuard } from 'src/guards/role.guard';

@Controller('user')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/add')
  @HttpCode(200)
  @Roles('user:add')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('/setRole')
  async userAddRole(@Body() addUserRole: AddUserRoleDto) {
    return await this.userService.userAddRole(addUserRole);
  }

  @Get('/list')
  @Roles('user:check')
  findAll(@Query() searchQuery: SearchQuery) {
    return this.userService.findAll(searchQuery);
  }

  @Get('/login')
  findOneByUserName(@Query('userName') userName: string) {
    return this.userService.findOneByUserName(userName);
  }

  @Get('/info')
  getUserInfo(@Req() req: any) {
    return this.userService.getUserInfo(req.user.userName);
  }

  @Roles('user:edit')
  @Put('/edit')
  update(@Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(updateUserDto);
  }

  @Roles('user:del')
  @Delete('/del')
  remove(@Query() query: { id: number }) {
    return this.userService.remove(query.id);
  }

  @Roles('user:delMany')
  @Delete('/del/delMany')
  removeMany(@Query() query: { ids: number[] }) {
    return this.userService.removeMany(query.ids);
  }
}
