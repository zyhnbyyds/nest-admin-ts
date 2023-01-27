import { Menu } from './entities/menu.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { TreeRepository } from 'typeorm';
import { transformMenu } from 'src/utils/menu/transformMenu';
import { buildUpMenuObj } from 'src/utils/menu/buildUpMenuObj';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: TreeRepository<Menu>,
  ) {}
  /** 创建menu菜单 */
  async create(createMenuDto: CreateMenuDto, userName: string) {
    let menuParent: Menu;
    if (createMenuDto.parentId != 0) {
      menuParent = await this.findOne(createMenuDto.parentId);
    }
    const menuChildren = new Menu();

    const newObj = Object.assign(createMenuDto, { createBy: userName });

    buildUpMenuObj(menuChildren, newObj);

    if (menuParent) {
      menuChildren.parent = menuParent;
    }

    await this.menuRepository.save(menuChildren);

    return null;
  }

  async findAll() {
    const res = await this.menuRepository.findTrees();
    if (res) {
      const result = transformMenu(res);
      return { routes: result, home: '/test' };
    }
    return null;
  }

  async findOne(id: number) {
    const res = await this.menuRepository.findOneBy({ id });
    if (!res) {
      throw new NotFoundException('未找到指定菜单~');
    }
    return res;
  }

  update(id: number, updateMenuDto: UpdateMenuDto) {
    return `This action updates a #${id} menu${updateMenuDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} menu`;
  }
}
