export class MenusList {
  id: number;
  component: 'basic' | 'blank' | 'multi' | 'self';
  path: string;
  requiresAuth?: boolean;
  keepAlive?: boolean;
  hide: boolean;
  href?: string;
  children: MenusList[];
  title: string;
  icon: string;
  order: number;
  affix?: boolean;
  multiTab?: boolean;
  localIcon?: string;
  singleLayout: 'basic' | 'blank';
  parentId?: number;
  redirect?: string;
  parent: MenusList | null;
  type: 'T' | 'M' | 'B';
  apiPerms: string;
}

export function transformMenu(menu: MenusList[]) {
  return menu.map((item) => {
    if (item === undefined) return undefined;
    const {
      title,
      icon,
      order,
      requiresAuth,
      localIcon,
      keepAlive,
      hide,
      href,
      affix,
      multiTab,
      singleLayout,
      type,
    } = item;
    const meta = {
      title,
      icon,
      order,
      requiresAuth,
      localIcon,
      keepAlive,
      singleLayout,
      multiTab,
      hide,
      href,
      affix,
      type,
    };
    item.parentId = item.parent ? item.parent.id : 0;
    [
      'title',
      'icon',
      'order',
      'requiresAuth',
      'keepAlive',
      'hide',
      'href',
      'affix',
      'multiTab',
      'localIcon',
      'singleLayout',
      'parent',
      'type',
    ].forEach((toRm) => {
      Reflect.deleteProperty(item, toRm);
    });
    item.children =
      item.children.length !== 0 ? transformMenu(item.children) : undefined;
    return { ...item, meta };
  });
}

export function transformOriginMenu(
  menu: MenusList[],
  targetMenuIds: number[],
) {
  menu.map((item, index) => {
    const status = targetMenuIds.some((id) => {
      return id === item.id;
    });
    if (!status) {
      menu.splice(index, 1);
    }
    if (item.children && item.children.length !== 0) {
      item.children = transformOriginMenu(item.children, targetMenuIds);
    }
  });
  return menu;
}
