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
    const res = await this.userRepository.findOneBy({
      userName: createUserDto.userName,
    });
    if (res) {
      throw new ForbiddenException('用户名相同~');
    }

    // 插入用户
    const data = await this.userRepository
      .createQueryBuilder('user')
      .insert()
      .into(User)
      .values(createUserDto)
      .execute();

    // 添加角色信息
    if (data && data.raw.insertId) {
      this.userAddRole({
        userId: data.raw.insertId,
        roleIds: createUserDto.rolesList,
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
    const roleIds = userAddRole.roleIds.split(',');
    // 发生错误抛出
    try {
      await this.userRepository
        .createQueryBuilder()
        .relation(User, 'roleIds')
        .of(userAddRole.userId)
        .remove(roleIds);

      await this.userRepository
        .createQueryBuilder()
        .relation(User, 'roleIds')
        .of(userAddRole.userId)
        .add(roleIds);
      return null;
    } catch (error) {
      throw new NotFoundException('传入的角色Id集合出错，查找不到对应信息~');
    }
  }

  /**
   * 获取用户下面的角色集合
   * @param id 用户id
   */
  async userRolesList(id: number) {
    const res = await this.userRepository.find({
      relations: ['roleIds'],
      where: { id },
    });
    return res;
  }

  async findAll(searchQuery: SearchQuery) {
    const [list, count] = await this.userRepository.findAndCount({
      skip: (searchQuery.pageNum - 1) * searchQuery.pageSize + 1,
      take: searchQuery.pageSize,
    });
    return {
      list,
      count,
    };
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

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOneById(id);
    return await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set(updateUserDto)
      .where('id= :id', { id })
      .execute();
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
