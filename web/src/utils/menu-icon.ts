import type { Component } from "vue";
import {
  Activity,
  Clock,
  Code2,
  FileText,
  FolderCog,
  Gauge,
  Home,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Monitor,
  Settings,
  Shield,
  SlidersHorizontal,
  Tags,
  UserCog,
  Users,
  Building2,
  Briefcase,
  Database,
  Server,
  LogIn,
  ScrollText,
  UserCheck,
  HardDrive,
} from "lucide-vue-next";

/**
 * 菜单图标映射：后端菜单 icon 字段 → lucide 图标组件
 * 未匹配时返回默认图标
 */
const ICON_MAP: Record<string, Component> = {
  home: Home,
  dashboard: LayoutDashboard,
  setting: Settings,
  system: Settings,
  monitor: Monitor,
  clock: Clock,
  file: FileText,
  code: Code2,
  user: Users,
  role: Shield,
  menu: ListChecks,
  dept: Building2,
  post: Briefcase,
  dict: Tags,
  config: SlidersHorizontal,
  loginlog: LogIn,
  operlog: ScrollText,
  online: UserCheck,
  cache: Database,
  job: Clock,
  files: HardDrive,
  generator: Code2,
  profile: UserCog,
  key: KeyRound,
  gauge: Gauge,
  server: Server,
  activity: Activity,
  folder: FolderCog,
};

const DEFAULT_ICON: Component = Activity;

/** 根据菜单 icon 字段解析图标组件 */
export function resolveMenuIcon(icon: string | null | undefined): Component {
  if (!icon) return DEFAULT_ICON;
  return ICON_MAP[icon.toLowerCase()] ?? DEFAULT_ICON;
}
