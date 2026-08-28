<script setup lang="ts">
import { ref } from "vue";
import { Trash2 } from "lucide-vue-next";
import {
  LewButton,
  LewDialog,
  LewInput,
  LewMessage,
  LewPagination,
  LewSelect,
  LewTable,
} from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { clearOperationLogs, deleteOperationLog } from "~/api/monitor";
import { useTable } from "~/composables/useTable";
import { formatDateTime } from "~/composables/useFormat";
import type { OperationLog } from "~/types/api";

// ---------- 列表 ----------
const query = ref<{ status?: string; userId?: string }>({});
const { items, loading, currentPage, pageSize, total, search, refresh, handleChange } =
  useTable<OperationLog>({
    url: "/monitor/operation-logs",
    query: () => ({
      status: query.value.status,
      userId: query.value.userId || undefined,
    }),
  });

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  { title: "用户ID", field: "userId", width: 90 },
  { title: "模块", field: "module", width: 140 },
  { title: "操作", field: "action", width: 140 },
  { title: "方法", field: "method", width: 200 },
  { title: "路径", field: "path" },
  { title: "状态码", field: "statusCode", width: 90 },
  { title: "耗时(ms)", field: "durationMs", width: 100 },
  { title: "IP", field: "ip", width: 130 },
  {
    title: "时间",
    field: "createdAt",
    width: 170,
    customRender: ({ row }) => formatDateTime((row as unknown as OperationLog).createdAt),
  },
  { title: "操作", field: "operation", width: 80, fixed: "right" },
];

void search();

const statusOptions = [
  { label: "成功", value: "success" },
  { label: "失败", value: "failure" },
];

// ---------- 删除/清空 ----------
function handleDelete(row: OperationLog) {
  LewDialog.warning({
    title: "删除确认",
    content: "确定删除该条操作日志吗？",
    onOk: async () => {
      await deleteOperationLog(row.id);
      LewMessage.success("删除成功");
      void refresh();
    },
  });
}

function handleClear() {
  LewDialog.warning({
    title: "清空确认",
    content: "确定清空所有操作日志吗？此操作不可恢复。",
    onOk: async () => {
      await clearOperationLogs();
      LewMessage.success("已清空");
      void refresh();
    },
  });
}
</script>

<template>
  <div class="page-container">
    <!-- 页头 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="page-title m-0">操作日志</h2>
        <p class="page-subtitle mt-1 mb-0">查看系统操作记录</p>
      </div>
      <LewButton
        v-permission="'monitor:operlog:delete'"
        type="fill"
        color="error"
        @click="handleClear"
      >
        <Trash2 :size="15" style="margin-right: 4px" /> 清空日志
      </LewButton>
    </div>

    <!-- 搜索栏 -->
    <div class="app-card flex items-center gap-3 p-4">
      <LewSelect
        v-model="query.status"
        width="140px"
        placeholder="状态"
        clearable
        :options="statusOptions"
      />
      <LewInput
        v-model="query.userId"
        width="160px"
        placeholder="用户ID"
        clearable
        @keydown.enter="search()"
      />
      <LewButton type="light" :loading="loading" @click="search()">查询</LewButton>
    </div>

    <!-- 表格 -->
    <div class="app-card overflow-hidden">
      <LewTable :columns="columns" :data-source="items" :loading="loading" size="small">
        <template #operation="{ row }">
          <LewButton
            v-permission="'monitor:operlog:delete'"
            type="text"
            size="small"
            color="error"
            @click="handleDelete(row as unknown as OperationLog)"
          >
            <Trash2 :size="14" />
          </LewButton>
        </template>
      </LewTable>

      <div class="flex justify-end p-3">
        <LewPagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          @change="handleChange"
        />
      </div>
    </div>
  </div>
</template>
