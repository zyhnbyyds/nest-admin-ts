<script setup lang="ts">
import { ref } from "vue";
import { Eye, Trash2 } from "lucide-vue-next";
import {
  LewButton,
  LewInput,
  LewMessage,
  LewModal,
  LewPagination,
  LewSelect,
  LewTable,
} from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { clearOperationLogs, deleteOperationLog } from "~/api/monitor";
import { useTable } from "~/composables/useTable";
import { formatDateTime } from "~/composables/useFormat";
import type { OperationLog } from "~/types/api";
import { confirmDanger } from "~/utils/confirm";
import IconButton from "~/components/IconButton.vue";

// ---------- 列表 ----------
const query = ref<{ status?: string; username?: string }>({});
const { items, loading, currentPage, pageSize, total, search, refresh, handleChange } =
  useTable<OperationLog>({
    url: "/monitor/operation-logs",
    query: () => ({
      status: query.value.status,
      username: query.value.username || undefined,
    }),
  });

const businessTypeLabels: Record<OperationLog["businessType"], string> = {
  insert: "新增",
  update: "修改",
  delete: "删除",
  other: "其他",
};

/** 模块名：UsersController.create → Users */
function moduleOf(log: OperationLog | null | undefined): string {
  if (!log) return "-";
  return log.title.split(".")[0]?.replace(/Controller$/, "") || "-";
}

/** 操作名：UsersController.create → 新增 · create */
function actionOf(log: OperationLog): string {
  const handler = log.method.split(".").pop() ?? "-";
  return `${businessTypeLabels[log.businessType] || log.businessType} · ${handler}`;
}

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  {
    title: "操作人",
    field: "username",
    width: 120,
    customRender: ({ row }) => {
      const log = row as unknown as OperationLog;
      return log.username ?? (log.userId ? `用户#${log.userId}` : "-");
    },
  },
  {
    title: "模块",
    field: "title",
    width: 100,
    customRender: ({ row }) => moduleOf(row as unknown as OperationLog),
  },
  {
    title: "操作",
    field: "method",
    width: 180,
    customRender: ({ row }) => actionOf(row as unknown as OperationLog),
  },
  { title: "方法", field: "requestMethod", width: 90 },
  { title: "路径", field: "url", width: 220 },
  {
    title: "状态",
    field: "status",
    width: 80,
    customRender: ({ row }) => {
      const log = row as unknown as OperationLog;
      const success = log.status === "success";
      return h(
        "span",
        {
          class: success
            ? "text-[var(--lew-color-success)]"
            : "text-[var(--lew-color-error)]",
          style: "font-weight: 600",
        },
        success ? "成功" : "失败",
      );
    },
  },
  { title: "耗时(ms)", field: "durationMs", width: 90 },
  {
    title: "IP",
    field: "ip",
    width: 130,
    customRender: ({ row }) => (row as unknown as OperationLog).ip || "-",
  },
  {
    title: "时间",
    field: "createdAt",
    width: 170,
    customRender: ({ row }) => formatDateTime((row as unknown as OperationLog).createdAt),
  },
  { title: "操作", field: "operation", width: 90, fixed: "right" },
];

void search();

const statusOptions = [
  { label: "成功", value: "success" },
  { label: "失败", value: "failure" },
];

// ---------- 详情弹窗 ----------
const detailVisible = ref(false);
const detail = ref<OperationLog | null>(null);

function openDetail(row: OperationLog) {
  detail.value = row;
  detailVisible.value = true;
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// ---------- 删除/清空 ----------
function handleDelete(row: OperationLog) {
  confirmDanger({
    title: "删除确认",
    content: "确定删除该条操作日志吗？",
    onConfirm: async () => {
      await deleteOperationLog(row.id);
      LewMessage.success("删除成功");
      void refresh();
    },
  });
}

function handleClear() {
  confirmDanger({
    title: "清空确认",
    content: "确定清空所有操作日志吗？此操作不可恢复。",
    confirmText: "清空",
    onConfirm: async () => {
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
        v-model="query.username"
        width="180px"
        placeholder="操作人"
        clearable
        @keydown.enter="search()"
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
          <div class="flex items-center gap-1">
            <IconButton title="详情" @click="openDetail(row as unknown as OperationLog)">
              <Eye :size="14" />
            </IconButton>
            <IconButton
              permission="monitor:operlog:delete"
              color="error"
              title="删除"
              @click="handleDelete(row as unknown as OperationLog)"
            >
              <Trash2 :size="14" />
            </IconButton>
          </div>
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

    <!-- 详情弹窗 -->
    <LewModal v-model:visible="detailVisible" title="操作日志详情" width="680px" :hide-footer="true">
      <div class="max-h-480px overflow-auto p-5">
        <!-- 基本信息 -->
        <div class="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-13px">
          <div><span class="text-[var(--app-text-muted)]">操作人：</span>{{ detail?.username ?? "-" }}（
            <span class="text-[var(--app-text-muted)]">ID:</span> {{ detail?.userId ?? "-" }}）</div>
          <div><span class="text-[var(--app-text-muted)]">模块：</span>{{ moduleOf(detail) }}</div>
          <div><span class="text-[var(--app-text-muted)]">操作：</span>{{ detail ? actionOf(detail) : "-" }}</div>
          <div><span class="text-[var(--app-text-muted)]">方法：</span>{{ detail?.requestMethod ?? "-" }}</div>
          <div class="col-span-2"><span class="text-[var(--app-text-muted)]">路径：</span>{{ detail?.url ?? "-" }}</div>
          <div>
            <span class="text-[var(--app-text-muted)]">状态：</span>
            <span :class="detail?.status === 'success' ? 'text-[var(--lew-color-success)]' : 'text-[var(--lew-color-error)]'" class="font-600">
              {{ detail?.status === "success" ? "成功" : "失败" }}
            </span>
          </div>
          <div><span class="text-[var(--app-text-muted)]">耗时：</span>{{ detail?.durationMs ?? "-" }} ms</div>
          <div><span class="text-[var(--app-text-muted)]">IP：</span>{{ detail?.ip || "-" }}</div>
          <div><span class="text-[var(--app-text-muted)]">时间：</span>{{ detail ? formatDateTime(detail.createdAt) : "-" }}</div>
        </div>

        <!-- 请求参数 -->
        <div v-if="detail?.requestBody != null" class="mb-3">
          <div class="mb-1 text-13px font-600">请求参数</div>
          <pre class="m-0 rounded-lg bg-[var(--app-bg-hover)] p-3 text-12px whitespace-pre-wrap break-all">{{ formatJson(detail.requestBody) }}</pre>
        </div>

        <!-- 返回参数 -->
        <div v-if="detail?.responseBody != null" class="mb-3">
          <div class="mb-1 text-13px font-600">返回参数</div>
          <pre class="m-0 rounded-lg bg-[var(--app-bg-hover)] p-3 text-12px whitespace-pre-wrap break-all">{{ formatJson(detail.responseBody) }}</pre>
        </div>

        <!-- 错误信息 -->
        <div v-if="detail?.errorMessage">
          <div class="mb-1 text-13px font-600 text-[var(--lew-color-error)]">错误信息</div>
          <pre class="m-0 rounded-lg bg-[var(--app-bg-hover)] p-3 text-12px whitespace-pre-wrap break-all text-[var(--lew-color-error)]">{{ detail.errorMessage }}</pre>
        </div>
      </div>
    </LewModal>
  </div>
</template>