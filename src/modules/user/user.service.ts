import { SearchQuery } from 'src/common/common.dto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto, AddUserRoleDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
  /**
   * 创建用户
   * @param createUserDto 参数
   * @returns null
   */
  async create(createUserDto: CreateUserDto) {
    const roleId = createUserDto.roleId;
    Reflect.deleteProperty(createUserDto, 'role');
    Reflect.deleteProperty(createUserDto, 'roleId');
    Reflect.deleteProperty(createUserDto, 'id');
    const res = await this.userRepository.findOneBy({
      userName: createUserDto.userName,
    });
    if (res) {
      throw new ForbiddenException('用户名相同~');
    }

    // 插入用户
    await this.userRepository
      .createQueryBuilder('user')
      .insert()
      .into(User)
      .values(createUserDto)
      .execute();

    const userInfo = await this.userRepository.findOneBy({
      userName: createUserDto.userName,
    });

    // 添加角色信息
    if (userInfo && roleId) {
      await this.userAddRole({
        userId: userInfo.id,
        roleId: roleId,
      });
    }
    return null;
  }

  /**
   * 为用户设定角色
   * @param userAddRole 要添加的用户，和对象集合
   * @returns null
   */
  async userAddRole(userAddRole: AddUserRoleDto) {
    // 验证传入的用户名是否合法
    await this.findOneById(userAddRole.userId);
    // 为用户添加角色，先删除后添加
    const { roleId } = userAddRole;
    // 发生错误抛出
    await this.userRepository
      .createQueryBuilder()
      .relation(User, 'role')
      .of(userAddRole.userId)
      .set(roleId);

    return null;
  }

  async findAll(searchQuery: SearchQuery) {
    const [list, count] = await this.userRepository.findAndCount({
      skip: (searchQuery.pageNum - 1) * searchQuery.pageSize + 1,
      take: searchQuery.pageSize,
      relations: ['role'],
    });
    const listAddRoleId = list.map((item) => {
      let roleId: number;
      item.role ? (roleId = item.role.id) : (roleId = 0);
      return {
        ...item,
        roleId: roleId,
      };
    });
    return {
      list: listAddRoleId,
      count,
    };
  }

  /**
   * 获取用户信息
   * @param userName 用户名
   * @returns 用户查询信息
   */
  async getUserInfo(userName: string) {
    return await this.findOneByUserName(userName);
  }

  async findOneByUserName(userName: string) {
    const res = await this.userRepository.findOneBy({ userName });
    if (!res) {
      throw new NotFoundException('未找到该用户信息');
    }
    return res;
  }

  /** 获取用户信息 */
  async findOneById(id: number) {
    const res = await this.userRepository.findOneBy({
      id,
    });
    if (!res) {
      throw new NotFoundException('未找到该用户信息~');
    }
    return res;
  }

  async update(updateUserDto: UpdateUserDto) {
    Reflect.deleteProperty(updateUserDto, 'role');
    const res = await this.userRepository.findOne({
      relations: ['role'],
      where: { id: updateUserDto.id },
    });
    // 如果角色id不相同，重新设定角色
    if (res.role.id !== updateUserDto.roleId) {
      await this.userAddRole({
        userId: res.id,
        roleId: updateUserDto.roleId,
      });
    }
    if (res) {
      Reflect.deleteProperty(updateUserDto, 'roleId');
      // 更改用户角色信息
      await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set(updateUserDto)
        .where('id= :id', { id: updateUserDto.id })
        .execute();
    }

    return null;
  }

  async remove(id: number) {
    await this.userRepository.findOneByOrFail({ id });
    return await this.userRepository
      .createQueryBuilder('user')
      .delete()
      .where('id= :id', { id })
      .execute();
  }
}
