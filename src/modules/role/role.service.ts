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

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private roleRepository: Repository<Role>,
  ) {}
  async create(createRoleDto: CreateRoleDto, req: any) {
    const res = await this.roleRepository.findOneBy({
      roleName: createRoleDto.roleName,
    });
    if (res) {
      throw new ForbiddenException('角色名重复，请切换重试~');
    }
    await this.roleRepository.save({
      ...createRoleDto,
      createdBy: req.user.userName,
    });
    return null;
  }

  async findAll(searchQuery: SearchQuery) {
    const { pageNum, pageSize } = searchQuery;
    const [list, count] = await this.roleRepository.findAndCount({
      skip: pageNum ? (pageNum - 1) * pageSize + 1 : undefined,
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
    await this.findOne(id);
    return this.roleRepository
      .createQueryBuilder('role')
      .delete()
      .where('id=:id', { id })
      .execute();
  }

  /** 删除多个 */
  async removeMany(ids: number[]) {
    this.roleRepository.createQueryBuilder().delete().whereInIds(ids).execute();
    console.log(ids);
  }
}
