import { Menu } from './entities/menu.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { TreeRepository } from 'typeorm';
import { transformMenu } from 'src/utils/menu/transformMenu';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: TreeRepository<Menu>,
  ) {}
  /** 创建menu菜单 */
  create(createMenuDto: CreateMenuDto) {
    return this.menuRepository
      .createQueryBuilder()
      .insert()
      .into(Menu)
      .values(createMenuDto)
      .execute();
  }

  async findAll() {
    const res = await this.menuRepository.findTrees();
    console.log(res);
    if (res) {
      const result = transformMenu(res);
      return result;
    }
    return null;
  }

  findOne(id: number) {
    return `This action returns a #${id} menu`;
  }

  update(id: number, updateMenuDto: UpdateMenuDto) {
    return `This action updates a #${id} menu${updateMenuDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} menu`;
  }
}
