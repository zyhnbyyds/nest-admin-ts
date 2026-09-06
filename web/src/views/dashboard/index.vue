<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from "vue";
import { useEventListener } from "@vueuse/core";
import dayjs from "dayjs";
import { LewTable } from "lew-ui";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { getCacheInfo, listLoginLogs } from "~/api/monitor";
import {
  getDashboardDepts,
  getDashboardMenus,
  getDashboardPosts,
  getDashboardRoles,
  getDashboardUsers,
} from "~/api/dashboard";
import { useSettingsStore } from "~/store/settings";
import { useUserStore } from "~/store/user";
import { formatDateTime } from "~/composables/useFormat";
import type { CacheInfo, LoginLog, MenuStats, StatusStats, UserStats } from "~/types/api";

echarts.use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
]);

const userStore = useUserStore();
const settings = useSettingsStore();

const hasPerm = (permission: string) => userStore.hasPermission(permission);

// ---------- 统计卡片数据 ----------
const cacheInfo = ref<CacheInfo | null>(null);
const userStats = ref<UserStats | null>(null);
const deptStats = ref<StatusStats | null>(null);
const roleStats = ref<StatusStats | null>(null);
const menuStats = ref<MenuStats | null>(null);
const postStats = ref<StatusStats | null>(null);

interface StatCard {
  label: string;
  value: string;
  sub?: string;
  badge?: string;
}

function fmt(value: number | string | undefined): string {
  if (value === undefined || value === null) return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("en-US");
}

const statCards = computed<StatCard[]>(() => {
  const cards: StatCard[] = [];
  if (hasPerm("system:user:list") && userStats.value) {
    cards.push({
      label: "用户总数",
      value: fmt(userStats.value.total),
      sub: `启用 ${fmt(userStats.value.active)} · 禁用 ${fmt(userStats.value.disabled)}`,
      badge: `今日新增 ${fmt(userStats.value.todayNew)}`,
    });
  }
  if (hasPerm("system:dept:list") && deptStats.value) {
    cards.push({
      label: "部门",
      value: fmt(deptStats.value.total),
      sub: `启用 ${fmt(deptStats.value.active)} · 停用 ${fmt(deptStats.value.disabled)}`,
    });
  }
  if (hasPerm("system:role:list") && roleStats.value) {
    cards.push({
      label: "角色",
      value: fmt(roleStats.value.total),
      sub: `启用 ${fmt(roleStats.value.active)}`,
    });
  }
  if (hasPerm("system:menu:list") && menuStats.value) {
    cards.push({
      label: "菜单",
      value: fmt(menuStats.value.total),
      sub: `目录 ${fmt(menuStats.value.directory)} · 菜单 ${fmt(menuStats.value.menu)} · 按钮 ${fmt(menuStats.value.button)}`,
    });
  }
  if (hasPerm("system:post:list") && postStats.value) {
    cards.push({
      label: "岗位",
      value: fmt(postStats.value.total),
      sub: `启用 ${fmt(postStats.value.active)}`,
    });
  }
  if (hasPerm("monitor:cache:list")) {
    cards.push({
      label: "缓存键数",
      value: cacheInfo.value ? fmt(cacheInfo.value.dbsize) : "-",
      sub: cacheInfo.value ? (cacheInfo.value.connected ? "状态：正常" : "状态：未连接") : "",
    });
  }
  cards.push({
    label: "我的角色",
    value: userStore.roles.join(", ") || "-",
  });
  return cards;
});

// ---------- 登录趋势 / 分布 ----------
const recentLogins = ref<LoginLog[]>([]);
const canSeeLogins = computed(() => hasPerm("monitor:loginlog:list"));

const trendRef = ref<HTMLElement>();
const pieRef = ref<HTMLElement>();

let trendChart: ReturnType<typeof echarts.init> | null = null;
let pieChart: ReturnType<typeof echarts.init> | null = null;

/** 近 7 日日期标签（MM/DD） */
function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
}

/** 按近 7 日统计登录次数（基于登录日志真实数据，以东八区日界为准） */
function buildTrend(logs: { createdAt: string }[]): number[] {
  const counts = Array.from({ length: 7 }, () => 0);
  const now = dayjs().tz().startOf("day");
  for (const log of logs) {
    const date = dayjs(log.createdAt).tz().startOf("day");
    const diffDays = now.diff(date, "day");
    if (diffDays >= 0 && diffDays < 7) counts[6 - diffDays]! += 1;
  }
  return counts;
}

/** 读取 CSS 变量（跟随主题/暗色/自定义主色），缺失时用回退值 */
function chartVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/** 构建当前主题下图表用到的颜色（含暗色与自定义主色随动） */
function chartTheme() {
  const isDark = settings.isDark;
  return {
    text: chartVar("--app-text-secondary", isDark ? "#acacb8" : "#3c3c46"),
    axisLine: chartVar("--app-border", isDark ? "#32323a" : "#e4e4ef"),
    splitLine: chartVar("--app-bg-hover", isDark ? "#26262c" : "#f0f0f4"),
    primary: chartVar("--lew-color-primary", isDark ? "#78a8ff" : "#1a73e8"),
    success: chartVar("--lew-color-success", "#62c68c"),
    danger: chartVar("--lew-color-danger", "#ff7875"),
    tooltipBg: chartVar("--app-bg-card", isDark ? "#1a1a1e" : "#ffffff"),
    tooltipBorder: chartVar("--app-border", isDark ? "#34343b" : "#e4e4e9"),
    tooltipText: chartVar("--app-text-primary", isDark ? "#f5f5f8" : "#101014"),
  };
}

/** 通用 tooltip 主题（暗色下深色底 + 主色边框 + 浅色文字） */
function themedTooltip(trigger: "axis" | "item") {
  const t = chartTheme();
  return {
    trigger,
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: t.tooltipText },
    extraCssText: "box-shadow: 0 2px 8px rgb(0 0 0 / 15%); border-radius: 8px;",
  };
}

/** 根据当前明暗模式与数据重绘两个图表 */
function renderCharts() {
  const t = chartTheme();

  if (trendChart) {
    trendChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: t.text },
      grid: { left: 40, right: 16, top: 30, bottom: 28 },
      tooltip: themedTooltip("axis"),
      xAxis: {
        type: "category",
        data: last7Days(),
        axisLine: { lineStyle: { color: t.axisLine } },
        axisLabel: { color: t.text },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: t.text },
        splitLine: { lineStyle: { color: t.splitLine } },
      },
      series: [
        {
          name: "登录次数",
          type: "line",
          smooth: true,
          data: buildTrend(recentLogins.value),
          lineStyle: { width: 2.5, color: t.primary },
          itemStyle: { color: t.primary },
          areaStyle: { color: t.primary, opacity: 0.12 },
        },
      ],
    });
  }

  if (pieChart) {
    const success = recentLogins.value.filter((item) => item.status === "success").length;
    const failure = recentLogins.value.length - success;
    pieChart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: t.text },
      tooltip: themedTooltip("item"),
      series: [
        {
          type: "pie",
          radius: ["52%", "78%"],
          label: { show: false },
          data: [
            { name: "成功", value: success || 1, itemStyle: { color: t.success } },
            { name: "失败", value: failure, itemStyle: { color: t.danger } },
          ],
        },
      ],
    });
  }
}

function initCharts() {
  if (trendRef.value) trendChart = echarts.init(trendRef.value);
  if (pieRef.value) pieChart = echarts.init(pieRef.value);
  renderCharts();
}

/** 窗口尺寸变化时让图表自适应 */
function handleResize() {
  trendChart?.resize();
  pieChart?.resize();
}

// 明暗模式 / 主题色变化时重绘图表（重绘时读取最新主题色与坐标轴颜色）
watch(() => settings.isDark, renderCharts);
watch(() => settings.primaryColor, renderCharts);
// 窗口尺寸变化自适应
useEventListener(window, "resize", handleResize);

// 侧边栏折叠/展开会改变主区宽度（不触发 window resize），等过渡(200ms)结束后再让图表自适应
let resizeTimer: number | undefined;
watch(
  () => settings.collapsed,
  () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(handleResize, 220);
  },
);

onUnmounted(() => {
  if (resizeTimer) window.clearTimeout(resizeTimer);
  trendChart?.dispose();
  pieChart?.dispose();
  trendChart = null;
  pieChart = null;
});

type Fetcher = () => Promise<unknown>;

onMounted(async () => {
  // 按权限并行拉取各自统计
  const tasks: { perm: string; fetch: Fetcher; apply: (v: unknown) => void }[] = [];
  if (hasPerm("system:user:list"))
    tasks.push({
      perm: "system:user:list",
      fetch: getDashboardUsers,
      apply: (v) => (userStats.value = v as UserStats),
    });
  if (hasPerm("system:dept:list"))
    tasks.push({
      perm: "system:dept:list",
      fetch: getDashboardDepts,
      apply: (v) => (deptStats.value = v as StatusStats),
    });
  if (hasPerm("system:role:list"))
    tasks.push({
      perm: "system:role:list",
      fetch: getDashboardRoles,
      apply: (v) => (roleStats.value = v as StatusStats),
    });
  if (hasPerm("system:menu:list"))
    tasks.push({
      perm: "system:menu:list",
      fetch: getDashboardMenus,
      apply: (v) => (menuStats.value = v as MenuStats),
    });
  if (hasPerm("system:post:list"))
    tasks.push({
      perm: "system:post:list",
      fetch: getDashboardPosts,
      apply: (v) => (postStats.value = v as StatusStats),
    });
  if (hasPerm("monitor:cache:list"))
    tasks.push({
      perm: "monitor:cache:list",
      fetch: getCacheInfo,
      apply: (v) => (cacheInfo.value = v as CacheInfo),
    });
  if (hasPerm("monitor:loginlog:list"))
    tasks.push({
      perm: "monitor:loginlog:list",
      fetch: () => listLoginLogs(1, 100),
      apply: (v) => {
        const items = (v as { items: LoginLog[] }).items;
        recentLogins.value = items;
      },
    });

  const results = await Promise.allSettled(tasks.map((t) => t.fetch()));
  results.forEach((result, index) => {
    if (result.status === "fulfilled") tasks[index]!.apply(result.value);
  });

  if (canSeeLogins.value) initCharts();
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 欢迎语 -->
    <div class="mb-1">
      <h2 class="page-title">你好，{{ userStore.username }} 👋</h2>
      <p class="page-subtitle mt-1 mb-0">欢迎回来，这是系统运行概览</p>
    </div>

    <!-- 统计卡片（细粒度权限控制） -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="stat in statCards"
        :key="stat.label"
        class="app-card relative flex flex-col gap-2 p-5"
      >
        <span class="text-13px text-[var(--app-text-muted)]">{{ stat.label }}</span>
        <span class="text-24px font-700 tracking--2%">{{ stat.value }}</span>
        <span v-if="stat.sub" class="text-12px text-[var(--app-text-muted)]">{{ stat.sub }}</span>
        <span
          v-if="stat.badge"
          class="tag-success absolute top-4 right-4 rounded-full px-2 py-0.5 text-12px"
        >
          {{ stat.badge }}
        </span>
      </div>
    </div>

    <!-- 图表区（需登录日志权限） -->
    <template v-if="canSeeLogins">
      <div class="grid grid-cols-3 gap-4">
        <div class="app-card col-span-2 p-5">
          <h3 class="mt-0 mb-3 text-15px font-600">近 7 日登录趋势</h3>
          <div ref="trendRef" class="h-260px" />
        </div>
        <div class="app-card p-5">
          <h3 class="mt-0 mb-3 text-15px font-600">近期登录状态分布</h3>
          <div ref="pieRef" class="h-260px" />
        </div>
      </div>

      <!-- 最近登录 -->
      <div class="app-card p-5">
        <h3 class="mt-0 mb-3 text-15px font-600">最近登录记录</h3>
        <LewTable
          :data-source="recentLogins"
          size="small"
          :focusable="false"
          :columns="[
            { title: '用户名', field: 'username' },
            { title: 'IP', field: 'ip' },
            {
              title: '状态',
              field: 'status',
              customRender: ({ row }: { row: unknown }) =>
                (row as { status: string }).status === 'success'
                  ? h('span', { class: 'tag-success' }, '成功')
                  : h('span', { class: 'tag-failure' }, '失败'),
            },
            {
              title: '时间',
              field: 'createdAt',
              customRender: ({ row }: { row: unknown }) =>
                formatDateTime((row as { createdAt: string }).createdAt),
            },
          ]"
        />
      </div>
    </template>
  </div>
</template>
