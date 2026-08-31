<script setup lang="ts">
import { nextTick, ref } from "vue";
import { FileClock, Pencil, Play, Plus, Trash2 } from "lucide-vue-next";
import {
  LewButton,
  LewForm,
  LewMessage,
  LewModal,
  LewPagination,
  LewTable,
} from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { clearJobLogs, createJob, deleteJob, listJobLogs, runJob, updateJob } from "~/api/jobs";
import { useTable } from "~/composables/useTable";

import type { Job, JobLog } from "~/types/api";
import { renderStatus } from "~/utils/render";
import { confirmDanger } from "~/utils/confirm";

// ---------- 任务列表 ----------
const { items, loading, currentPage, pageSize, total, search, refresh, handleChange } =
  useTable<Job>({ url: "/system/jobs" });

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  { title: "任务名称", field: "name", width: 180 },
  { title: "处理器", field: "handler", width: 200 },
  { title: "Cron 表达式", field: "cron", width: 140 },
  {
    title: "状态",
    field: "status",
    width: 90,
    customRender: ({ row }) => renderStatus((row as { status: string }).status),
  },
  {
    title: "允许并发",
    field: "concurrent",
    width: 90,
    customRender: ({ row }) => ((row as unknown as Job).concurrent ? "是" : "否"),
  },
  { title: "备注", field: "remark" },
  { title: "操作", field: "operation", width: 150, fixed: "right" },
];

void search();

// ---------- 新增/编辑 ----------
const modalVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref();
const form = ref({
  name: "",
  handler: "",
  cron: "",
  status: "active",
  concurrent: false,
  remark: "",
});
/** 表单 key：每次打开弹窗自增，强制重建 LewForm 以回填数据 */
const formKey = ref(0);

const statusOptions = [
  { label: "启用", value: "active" },
  { label: "停用", value: "disabled" },
];

function openCreate() {
  editingId.value = null;
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({
      name: "",
      handler: "",
      cron: "",
      status: "active",
      concurrent: false,
      remark: "",
    });
  });
}

function openEdit(row: Job) {
  editingId.value = row.id;
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({
      name: row.name,
      handler: row.handler,
      cron: row.cron,
      status: row.status,
      concurrent: row.concurrent,
      remark: row.remark ?? "",
    });
  });
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  const values = (formRef.value?.getForm?.() ?? form.value) as typeof form.value;
  const body = {
    name: values.name,
    handler: values.handler,
    cron: values.cron,
    status: values.status as "active" | "disabled",
    concurrent: values.concurrent,
    remark: values.remark || undefined,
  };
  if (editingId.value === null) {
    await createJob(body);
    LewMessage.success("创建成功");
  } else {
    await updateJob(editingId.value, body);
    LewMessage.success("更新成功");
  }
  modalVisible.value = false;
  void refresh();
}

// ---------- 手动执行 ----------
function handleRun(row: Job) {
  confirmDanger({
    type: "normal",
    title: "手动执行",
    content: `确定立即执行任务「${row.name}」吗？`,
    confirmText: "执行",
    confirmColor: "primary",
    onConfirm: async () => {
      await runJob(row.id);
      LewMessage.success("已触发执行");
    },
  });
}

// ---------- 删除 ----------
function handleDelete(row: Job) {
  confirmDanger({
    title: "删除确认",
    content: `确定删除任务「${row.name}」吗？`,
    onConfirm: async () => {
      await deleteJob(row.id);
      LewMessage.success("删除成功");
      void refresh();
    },
  });
}

// ---------- 执行日志 ----------
const logsVisible = ref(false);
const logsJob = ref<Job | null>(null);
const logs = ref<JobLog[]>([]);
const logsLoading = ref(false);

async function openLogs(row: Job) {
  logsJob.value = row;
  logsVisible.value = true;
  logsLoading.value = true;
  try {
    const data = await listJobLogs(row.id, 1, 50);
    logs.value = data.items;
  } finally {
    logsLoading.value = false;
  }
}

async function handleClearLogs() {
  confirmDanger({
    title: "清空确认",
    content: "确定清空所有任务执行日志吗？",
    confirmText: "清空",
    onConfirm: async () => {
      await clearJobLogs();
      LewMessage.success("已清空");
      if (logsJob.value) await openLogs(logsJob.value);
    },
  });
}
</script>

<template>
  <div class="page-container">
    <!-- 页头 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="page-title m-0">定时任务</h2>
        <p class="page-subtitle mt-1 mb-0">管理定时任务调度</p>
      </div>
      <div class="flex gap-2">
        <LewButton
          v-permission="'system:job:delete'"
          type="light"
          color="error"
          @click="handleClearLogs"
        >
          <Trash2 :size="15" style="margin-right: 4px" /> 清空日志
        </LewButton>
        <LewButton v-permission="'system:job:create'" type="fill" @click="openCreate">
          <Plus :size="15" style="margin-right: 4px" /> 新增任务
        </LewButton>
      </div>
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
            <LewButton
              v-permission="'system:job:run'"
              type="text"
              size="small"
              title="手动执行"
              @click="handleRun(row as unknown as Job)"
            >
              <Play :size="14" />
            </LewButton>
            <LewButton
              type="text"
              size="small"
              title="执行日志"
              @click="openLogs(row as unknown as Job)"
            >
              <FileClock :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:job:update'"
              type="text"
              size="small"
              @click="openEdit(row as unknown as Job)"
            >
              <Pencil :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:job:delete'"
              type="text"
              size="small"
              color="error"
              @click="handleDelete(row as unknown as Job)"
            >
              <Trash2 :size="14" />
            </LewButton>
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

    <!-- 新增/编辑弹窗 -->
    <LewModal
      v-model:visible="modalVisible"
      :title="editingId === null ? '新增任务' : '编辑任务'"
      width="500px"
      :footer-buttons="[
        {
          props: {
            type: 'text',
            color: 'gray',
            size: 'small',
            text: '取消',
            request: () => {
              modalVisible = false;
            },
          },
        },
        {
          props: {
            type: 'fill',
            color: 'primary',
            size: 'small',
            text: '保存',
            request: handleSubmit,
          },
        },
      ]"
    >
      <div class="p-5">
        <LewForm
          :key="formKey"
          ref="formRef"
          v-model="form"
          label-width="80px"
          :options="[
            {
              field: 'name',
              label: '任务名称',
              as: 'input',
              rule: 'Yup.string().required()',
              props: { placeholder: '如 数据同步任务', clearable: true },
            },
            {
              field: 'handler',
              label: '处理器',
              as: 'input',
              rule: 'Yup.string().required()',
              props: { placeholder: '如 syncData', clearable: true },
            },
            {
              field: 'cron',
              label: 'Cron',
              as: 'input',
              rule: 'Yup.string().required()',
              props: { placeholder: '如 0 0 * * *', clearable: true },
            },
            { field: 'status', label: '状态', as: 'select', props: { options: statusOptions } },
            { field: 'concurrent', label: '允许并发', as: 'switch' },
            {
              field: 'remark',
              label: '备注',
              as: 'textarea',
              props: { placeholder: '选填', rows: 2 },
            },
          ]"
        />
      </div>
    </LewModal>

    <!-- 执行日志弹窗 -->
    <LewModal
      v-model:visible="logsVisible"
      :title="`执行日志 - ${logsJob?.name ?? ''}`"
      width="720px"
      :hide-footer="true"
    >
      <div class="p-5">
        <LewTable
          :data-source="logs"
          :loading="logsLoading"
          :focusable="false"
          size="small"
          :columns="[
            { title: 'ID', field: 'id', width: 70 },
            { title: '状态', field: 'status', width: 90 },
            { title: '消息', field: 'message' },
            { title: '开始时间', field: 'startedAt', width: 170 },
            { title: '结束时间', field: 'finishedAt', width: 170 },
            { title: '耗时(ms)', field: 'durationMs', width: 100 },
          ]"
        />
      </div>
    </LewModal>
  </div>
</template>
