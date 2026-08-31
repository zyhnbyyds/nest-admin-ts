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
import { clearLoginLogs, deleteLoginLog } from "~/api/monitor";
import { useTable } from "~/composables/useTable";
import { formatDateTime } from "~/composables/useFormat";
import { renderTag } from "~/utils/render";
import type { LoginLog } from "~/types/api";

// ---------- 列表 ----------
const query = ref<{ username?: string; status?: string }>({});
const { items, loading, currentPage, pageSize, total, search, refresh, handleChange } =
  useTable<LoginLog>({
    url: "/monitor/login-logs",
    query: () => query.value,
  });

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  { title: "用户名", field: "username", width: 140 },
  { title: "IP", field: "ip", width: 140 },
  { title: "User-Agent", field: "userAgent" },
  {
    title: "状态",
    field: "status",
    width: 90,
    customRender: ({ row }) =>
      (row as unknown as LoginLog).status === "success"
        ? renderTag("成功", "tag-success")
        : renderTag("失败", "tag-failure"),
  },
  { title: "消息", field: "message", width: 200 },
  {
    title: "时间",
    field: "createdAt",
    width: 170,
    customRender: ({ row }) => formatDateTime((row as unknown as LoginLog).createdAt),
  },
  { title: "操作", field: "operation", width: 80, fixed: "right" },
];

void search();

const statusOptions = [
  { label: "成功", value: "success" },
  { label: "失败", value: "failure" },
];

// ---------- 删除/清空 ----------
function handleDelete(row: LoginLog) {
  LewDialog.warning({
    title: "删除确认",
    content: `确定删除该条登录日志吗？`,
    onOk: async () => {
      await deleteLoginLog(row.id);
      LewMessage.success("删除成功");
      void refresh();
    },
  });
}

function handleClear() {
  LewDialog.warning({
    title: "清空确认",
    content: "确定清空所有登录日志吗？此操作不可恢复。",
    onOk: async () => {
      await clearLoginLogs();
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
        <h2 class="page-title m-0">登录日志</h2>
        <p class="page-subtitle mt-1 mb-0">查看系统登录记录</p>
      </div>
      <LewButton
        v-permission="'monitor:loginlog:delete'"
        type="fill"
        color="error"
        @click="handleClear"
      >
        <Trash2 :size="15" style="margin-right: 4px" /> 清空日志
      </LewButton>
    </div>

    <!-- 搜索栏 -->
    <div class="app-card flex items-center gap-3 p-4">
      <LewInput
        v-model="query.username"
        width="200px"
        placeholder="用户名"
        clearable
        @keydown.enter="search()"
      />
      <LewSelect
        v-model="query.status"
        width="140px"
        placeholder="状态"
        clearable
        :options="statusOptions"
      />
      <LewButton type="light" :loading="loading" @click="search()">查询</LewButton>
    </div>

    <!-- 表格 -->
    <div class="app-card overflow-hidden">
      <LewTable
        :columns="columns"
        :data-source="items"
        :loading="loading"
        :focusable="false"
        size="small"
      >
        <template #operation="{ row }">
          <LewButton
            v-permission="'monitor:loginlog:delete'"
            type="text"
            size="small"
            color="error"
            @click="handleDelete(row as unknown as LoginLog)"
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
