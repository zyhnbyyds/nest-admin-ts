<script setup lang="ts">
import { h, onMounted, ref } from "vue";
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
import { getCacheInfo } from "~/api/monitor";
import { listLoginLogs } from "~/api/monitor";
import { listUsers } from "~/api/system/users";
import { useUserStore } from "~/store/user";
import { formatDateTime } from "~/composables/useFormat";

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

const stats = ref([
  { label: "用户总数", value: "-" },
  { label: "缓存键数", value: "-" },
  { label: "缓存状态", value: "-" },
  { label: "我的角色", value: "-" },
]);

const recentLogins = ref<
  { username: string; ip: string | null; status: string; createdAt: string }[]
>([]);

const trendRef = ref<HTMLElement>();
const pieRef = ref<HTMLElement>();

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

function initCharts() {
  if (trendRef.value) {
    const chart = echarts.init(trendRef.value);
    const isDark = document.documentElement.classList.contains("lew-dark");
    chart.setOption({
      textStyle: { color: isDark ? "#b8b8c0" : "#3c3c46" },
      grid: { left: 40, right: 16, top: 30, bottom: 28 },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: last7Days(),
        axisLine: { lineStyle: { color: isDark ? "#32323a" : "#e4e4ef" } },
      },
      yAxis: { type: "value", splitLine: { lineStyle: { color: isDark ? "#26262c" : "#f0f0f4" } } },
      series: [
        {
          name: "登录次数",
          type: "line",
          smooth: true,
          data: buildTrend(recentLogins.value),
          lineStyle: { width: 2.5 },
          areaStyle: { opacity: 0.12 },
          itemStyle: { color: "#78a8ff" },
        },
      ],
    });
  }

  // 登录状态分布
  if (pieRef.value) {
    const chart = echarts.init(pieRef.value);
    const success = recentLogins.value.filter((item) => item.status === "success").length;
    const failure = recentLogins.value.length - success;
    chart.setOption({
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: ["52%", "78%"],
          label: { show: false },
          data: [
            { name: "成功", value: success || 1, itemStyle: { color: "#62c68c" } },
            { name: "失败", value: failure, itemStyle: { color: "#ff7875" } },
          ],
        },
      ],
    });
  }
}

onMounted(async () => {
  // 并行拉取统计数据（登录日志拉取较多条用于趋势统计）
  const [users, cache, logs] = await Promise.allSettled([
    listUsers(1, 100),
    getCacheInfo(),
    listLoginLogs(1, 100),
  ]);

  if (users.status === "fulfilled") {
    // 后端分页无 total，用满页估算
    const count = users.value.items.length;
    stats.value[0]!.value = count >= 100 ? "100+" : String(count);
  }
  if (cache.status === "fulfilled") {
    stats.value[1]!.value = String(cache.value.dbsize ?? "-");
    stats.value[2]!.value = cache.value.connected ? "正常" : "未连接";
  }
  stats.value[3]!.value = userStore.roles.join(", ") || "-";

  if (logs.status === "fulfilled") {
    recentLogins.value = logs.value.items.map((item) => ({
      username: item.username,
      ip: item.ip,
      status: item.status,
      createdAt: item.createdAt,
    }));
  }

  initCharts();
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 欢迎语 -->
    <div class="mb-1">
      <h2 class="page-title">你好，{{ userStore.username }} 👋</h2>
      <p class="page-subtitle mt-1 mb-0">欢迎回来，这是系统运行概览</p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-4 gap-4">
      <div v-for="stat in stats" :key="stat.label" class="app-card flex flex-col gap-2 p-5">
        <span class="text-13px text-[var(--app-text-muted)]">{{ stat.label }}</span>
        <span class="text-24px font-700 tracking--2%">{{ stat.value }}</span>
      </div>
    </div>

    <!-- 图表区 -->
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
            customRender: ({ row }) =>
              (row as { status: string }).status === 'success'
                ? h('span', { class: 'tag-success' }, '成功')
                : h('span', { class: 'tag-failure' }, '失败'),
          },
          {
            title: '时间',
            field: 'createdAt',
            customRender: ({ row }) => formatDateTime((row as { createdAt: string }).createdAt),
          },
        ]"
      />
    </div>
  </div>
</template>
