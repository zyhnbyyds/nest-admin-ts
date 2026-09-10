import type { MenuStats, StatusStats, UserStats } from '~/types/api';
import { get } from '~/request';

// ---------- 首页统计（细粒度权限，见后端 dashboard 模块） ----------

/** 用户统计 */
export function getDashboardUsers() {
  return get<UserStats>('/dashboard/users');
}

/** 部门统计 */
export function getDashboardDepts() {
  return get<StatusStats>('/dashboard/depts');
}

/** 角色统计 */
export function getDashboardRoles() {
  return get<StatusStats>('/dashboard/roles');
}

/** 菜单统计 */
export function getDashboardMenus() {
  return get<MenuStats>('/dashboard/menus');
}

/** 岗位统计 */
export function getDashboardPosts() {
  return get<StatusStats>('/dashboard/posts');
}
