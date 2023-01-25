import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, AddUserRoleDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchQuery } from 'src/common/common.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('/setRole')
  async userAddRole(@Body() addUserRole: AddUserRoleDto) {
    return await this.userService.userAddRole(addUserRole);
  }

  @Get('/list')
  findAll(@Query() searchQuery: SearchQuery) {
    return this.userService.findAll(searchQuery);
  }

  @Get('/login')
  findOneByUserName(@Query('userName') userName: string) {
    return this.userService.findOneByUserName(userName);
  }

  @Get('/role/list/:id')
  userRolesList(@Param('id') id: number) {
    return this.userService.userRolesList(+id);
  }

  @Get(':id')
  findOneById(@Param('id') id: number) {
    return this.userService.findOneById(+id);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.userService.remove(+id);
  }
}
