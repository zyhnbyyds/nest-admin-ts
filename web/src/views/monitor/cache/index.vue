<script setup lang="ts">
import { onMounted, ref } from "vue";
import { LewTable, LewTag } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { getCacheInfo } from "~/api/monitor";
import type { CacheInfo } from "~/types/api";

const info = ref<CacheInfo | null>(null);
const loading = ref(false);

const columns: LewTableColumn[] = [
  { title: "指标", field: "label", width: 200 },
  { title: "值", field: "value" },
];

const rows = ref<{ label: string; value: string }[]>([]);

async function fetchInfo() {
  loading.value = true;
  try {
    info.value = await getCacheInfo();
    rows.value = [
      { label: "Redis 启用", value: info.value.enabled ? "是" : "否" },
      { label: "连接状态", value: info.value.connected ? "正常" : "异常" },
      { label: "键数量", value: String(info.value.dbsize) },
    ];
  } finally {
    loading.value = false;
  }
}

void onMounted(fetchInfo);
</script>

<template>
  <div class="page-container">
    <!-- 页头 -->
    <div>
      <h2 class="page-title m-0">缓存监控</h2>
      <p class="page-subtitle mt-1 mb-0">查看 Redis 缓存运行状态</p>
    </div>

    <!-- 状态卡片 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="app-card flex flex-col gap-2 p-5">
        <span class="text-13px text-[var(--app-text-muted)]">Redis 启用</span>
        <LewTag :color="info?.enabled ? 'success' : 'error'" size="small">
          {{ info?.enabled ? "已启用" : "未启用" }}
        </LewTag>
      </div>
      <div class="app-card flex flex-col gap-2 p-5">
        <span class="text-13px text-[var(--app-text-muted)]">连接状态</span>
        <LewTag :color="info?.connected ? 'success' : 'error'" size="small">
          {{ info?.connected ? "正常" : "异常" }}
        </LewTag>
      </div>
      <div class="app-card flex flex-col gap-2 p-5">
        <span class="text-13px text-[var(--app-text-muted)]">键数量</span>
        <span class="text-24px font-700 tracking--2%">{{ info?.dbsize ?? "-" }}</span>
      </div>
    </div>

    <!-- 详情表 -->
    <div class="app-card overflow-hidden">
      <LewTable
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :focusable="false"
        size="small"
      />
    </div>
  </div>
</template>
