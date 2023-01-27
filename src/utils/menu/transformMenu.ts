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
}

export function transformMenu(menu: MenusList[]) {
  return menu.map((item) => {
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
    };
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
    ].forEach((toRm) => {
      Reflect.deleteProperty(item, toRm);
    });
    if (item.children) {
      item.children = transformMenu(item.children);
    }
    return { ...item, meta };
  });
}
