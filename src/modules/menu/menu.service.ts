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

  async findAll(depth?: number) {
    const res = await this.menuRepository.findTrees({
      relations: ['parent', 'children'],
      depth,
    });
    if (res) {
      const result = transformMenu(res);
      return { routes: result, home: 'dashboard_analysis' };
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

  /**
   * 修改菜单，先删除后添加，保证菜单的父子关系。
   * @param updateMenuDto
   * @param userName
   * @returns
   */
  async update(updateMenuDto: UpdateMenuDto, userName: string) {
    ['children', 'meta', 'createTime', 'updateTime', 'deleteTime'].forEach(
      (item) => {
        Reflect.deleteProperty(updateMenuDto, item);
      },
    );

    await this.create(updateMenuDto as CreateMenuDto, userName);
    return null;
  }

  async remove(id: number) {
    return await this.menuRepository
      .createQueryBuilder()
      .delete()
      .where('id=:id', { id })
      .execute();
  }
}
