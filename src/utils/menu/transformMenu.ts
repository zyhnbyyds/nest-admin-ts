export class MenusList {
  id: number;
  component: 'basic' | 'blank' | 'multi' | 'self';
  path: string;
  requiresAuth: boolean;
  keepAlive: boolean;
  hide: boolean;
  href: string;
  children: MenusList[];
  title: string;
  icon: string;
  order: number;
}

export function transformMenu(menu: MenusList[]) {
  return menu.map((item) => {
    const { title, icon, order } = item;
    const meta = {
      title,
      icon,
      order,
    };
    ['title', 'icon', 'order'].forEach((toRm) => {
      Reflect.deleteProperty(item, toRm);
    });
    if (item.children) {
      item.children = transformMenu(item.children);
    }
    return { ...item, meta };
  });
}
