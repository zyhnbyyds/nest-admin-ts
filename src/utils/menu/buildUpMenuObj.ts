import { Menu } from 'src/modules/menu/entities/menu.entity';
import { CreateMenuDto } from './../../modules/menu/dto/create-menu.dto';

class MenuParams extends CreateMenuDto {
  createBy: string;
}

/**
 * 组合菜单参数对象
 * @param targetObj 目标的要添加参数的MenuTarget
 * @param obj 要添加的对象信息
 */
export function buildUpMenuObj(targetObj: Menu, obj: MenuParams) {
  ['children', 'meta', 'createTime', 'updateTime', 'deleteTime'].forEach(
    (item) => {
      Reflect.deleteProperty(obj, item);
    },
  );
  const keys = Reflect.ownKeys(obj);
  keys.map((item) => {
    Reflect.set(targetObj, item, obj[item]);
    return null;
  });
}
