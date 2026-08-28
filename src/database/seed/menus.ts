import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { menus, roleMenus, roles } from '../schema/index';

/**
 * 初始化菜单数据（与 web 前端页面一一对应）
 * 运行：bun run db:seed:menus
 */
type MenuSeed = {
  parentKey?: string; // 父菜单的 name，用于建立父子关系
  name: string;
  title: string;
  type: 'M' | 'C' | 'F';
  path?: string;
  component?: string;
  permission?: string;
  icon?: string;
  sort: number;
};

const MENU_SEEDS: MenuSeed[] = [
  // ===== 首页 =====
  {
    name: 'dashboard',
    title: '首页',
    type: 'C',
    path: '/dashboard',
    component: 'dashboard/index',
    icon: 'home',
    sort: 1,
  },
  // ===== 系统管理（目录）=====
  {
    name: 'system',
    title: '系统管理',
    type: 'M',
    path: '/system',
    icon: 'setting',
    sort: 2,
  },
  {
    parentKey: 'system',
    name: 'system_users',
    title: '用户管理',
    type: 'C',
    path: '/system/users',
    component: 'system/users/index',
    permission: 'system:user:list',
    icon: 'user',
    sort: 1,
  },
  {
    parentKey: 'system',
    name: 'system_roles',
    title: '角色管理',
    type: 'C',
    path: '/system/roles',
    component: 'system/roles/index',
    permission: 'system:role:list',
    icon: 'role',
    sort: 2,
  },
  {
    parentKey: 'system',
    name: 'system_menus',
    title: '菜单管理',
    type: 'C',
    path: '/system/menus',
    component: 'system/menus/index',
    permission: 'system:menu:list',
    icon: 'menu',
    sort: 3,
  },
  {
    parentKey: 'system',
    name: 'system_depts',
    title: '部门管理',
    type: 'C',
    path: '/system/depts',
    component: 'system/depts/index',
    permission: 'system:dept:list',
    icon: 'dept',
    sort: 4,
  },
  {
    parentKey: 'system',
    name: 'system_posts',
    title: '岗位管理',
    type: 'C',
    path: '/system/posts',
    component: 'system/posts/index',
    permission: 'system:post:list',
    icon: 'post',
    sort: 5,
  },
  {
    parentKey: 'system',
    name: 'system_dicts',
    title: '字典管理',
    type: 'C',
    path: '/system/dicts',
    component: 'system/dicts/index',
    permission: 'system:dict:list',
    icon: 'dict',
    sort: 6,
  },
  {
    parentKey: 'system',
    name: 'system_configs',
    title: '参数配置',
    type: 'C',
    path: '/system/configs',
    component: 'system/configs/index',
    permission: 'system:config:list',
    icon: 'config',
    sort: 7,
  },
  // ===== 系统监控（目录）=====
  {
    name: 'monitor',
    title: '系统监控',
    type: 'M',
    path: '/monitor',
    icon: 'monitor',
    sort: 3,
  },
  {
    parentKey: 'monitor',
    name: 'monitor_login_logs',
    title: '登录日志',
    type: 'C',
    path: '/monitor/login-logs',
    component: 'monitor/login-logs/index',
    permission: 'monitor:loginlog:list',
    icon: 'loginlog',
    sort: 1,
  },
  {
    parentKey: 'monitor',
    name: 'monitor_operation_logs',
    title: '操作日志',
    type: 'C',
    path: '/monitor/operation-logs',
    component: 'monitor/operation-logs/index',
    permission: 'monitor:operlog:list',
    icon: 'operlog',
    sort: 2,
  },
  {
    parentKey: 'monitor',
    name: 'monitor_online',
    title: '在线用户',
    type: 'C',
    path: '/monitor/online',
    component: 'monitor/online/index',
    permission: 'monitor:online:list',
    icon: 'online',
    sort: 3,
  },
  {
    parentKey: 'monitor',
    name: 'monitor_cache',
    title: '缓存监控',
    type: 'C',
    path: '/monitor/cache',
    component: 'monitor/cache/index',
    permission: 'monitor:cache:list',
    icon: 'cache',
    sort: 4,
  },
  // ===== 定时任务 =====
  {
    name: 'jobs',
    title: '定时任务',
    type: 'C',
    path: '/jobs',
    component: 'jobs/index',
    permission: 'system:job:list',
    icon: 'clock',
    sort: 4,
  },
  // ===== 文件管理 =====
  {
    name: 'files',
    title: '文件管理',
    type: 'C',
    path: '/files',
    component: 'files/index',
    permission: 'system:file:list',
    icon: 'file',
    sort: 5,
  },
  // ===== 代码生成器 =====
  {
    name: 'generator',
    title: '代码生成器',
    type: 'C',
    path: '/generator',
    component: 'generator/index',
    permission: 'system:generator:list',
    icon: 'code',
    sort: 6,
  },
];

async function seedMenus(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const pool = mysql.createPool(url);
  const db = drizzle({ client: pool });

  // 清空旧菜单与角色菜单关联
  await db.delete(roleMenus);
  await db.delete(menus);

  // 插入菜单并记录 id 映射
  const idMap = new Map<string, number>();
  for (const seed of MENU_SEEDS) {
    const parentId = seed.parentKey ? (idMap.get(seed.parentKey) ?? 0) : 0;
    const result = await db.insert(menus).values({
      parentId,
      name: seed.name,
      title: seed.title,
      type: seed.type,
      path: seed.path ?? null,
      component: seed.component ?? null,
      permission: seed.permission ?? null,
      icon: seed.icon ?? null,
      sort: seed.sort,
      visible: true,
      cacheable: false,
      external: false,
      status: 'active',
    });
    idMap.set(seed.name, Number(result[0].insertId));
  }

  // 给 admin 角色分配所有菜单权限
  const [adminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.key, 'admin'))
    .limit(1);
  if (!adminRole) throw new Error('Admin role not found, run db:seed first');

  const allMenuIds = [...idMap.values()];
  await db
    .insert(roleMenus)
    .values(allMenuIds.map((menuId) => ({ roleId: adminRole.id, menuId })));

  console.log(
    `[seed:menus] Inserted ${MENU_SEEDS.length} menus and assigned to admin role`,
  );
  await pool.end();
}

void seedMenus();
