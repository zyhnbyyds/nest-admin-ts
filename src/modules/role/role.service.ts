import { MenuService } from './../menu/menu.service';
import { SearchQuery } from 'src/common/common.dto';
import { Role } from './entities/role.entity';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { transformOriginMenu } from 'src/utils/menu/transformMenu';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly menuService: MenuService,
  ) {}
  async create(createRoleDto: CreateRoleDto, req: any) {
    Reflect.deleteProperty(createRoleDto, 'id');
    const res = await this.roleRepository.findOneBy({
      roleName: createRoleDto.roleName,
    });
    if (res) {
      throw new ForbiddenException('角色名重复，请切换重试~');
    }
    const rst = await this.roleRepository.save({
      ...createRoleDto,
      createdBy: req.user.userName,
    });
    await this.roleSetAuth(rst.id, createRoleDto.checkedKeys);
    return null;
  }

  async findAll(searchQuery: SearchQuery) {
    const { pageNum, pageSize } = searchQuery;
    const [list, count] = await this.roleRepository.findAndCount({
      skip: pageNum ? (pageNum - 1) * searchQuery.pageSize : undefined,
      take: pageSize ? pageSize : undefined,
    });
    return { list, count };
  }

  async findOne(id: number) {
    const res = await this.roleRepository.findOneBy({ id });
    if (!res) {
      throw new NotFoundException('未找到指定角色~');
    }
    return res;
  }

  update(updateRoleDto: UpdateRoleDto) {
    return this.roleRepository
      .createQueryBuilder('role')
      .update(Role)
      .set(updateRoleDto)
      .where('id=:id', { id: updateRoleDto.id })
      .execute();
  }

  async remove(id: number) {
    try {
      await this.findOne(id);
      await this.roleRepository
        .createQueryBuilder('role')
        .delete()
        .where('id=:id', { id })
        .execute();
    } catch (error) {
      throw new ForbiddenException(
        '角色下有用户，删除可能会导致系统异常，请先清理角色下挂的用户，再尝试删除',
      );
    }
  }

  async getAuthList(roleId: number, type?: 'menus' | 'menuIds') {
    const res = await this.roleRepository
      .createQueryBuilder()
      .relation(Role, 'auths')
      .of(roleId)
      .loadMany();
    return type === 'menus'
      ? res
      : res.map((item) => {
          return item.id;
        });
  }

  async roleSetAuth(roleId: number, authList: number[]) {
    await this.findOne(roleId);
    const authListIds = await this.getAuthList(roleId, 'menuIds');
    for (let index = 0; index < authList.length; index++) {
      await this.menuService.findOne(authList[index]);
    }
    // 为角色添加权限，先删除该角色下的权限，再重新添加
    await this.roleRepository
      .createQueryBuilder()
      .relation(Role, 'auths')
      .of(roleId)
      .remove(authListIds);

    await this.roleRepository
      .createQueryBuilder()
      .relation(Role, 'auths')
      .of(roleId)
      .add(authList);
    return null;
  }

  async getMenuList(roleId: number) {
    const res = await this.getAuthList(roleId, 'menuIds');
    const rst = await this.menuService.findAll(1);
    return {
      routes: transformOriginMenu(rst.routes, res),
      home: 'dashboard_analysis',
    };
  }
}
