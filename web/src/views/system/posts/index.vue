<script setup lang="ts">
import { ref } from "vue";
import { Pencil, Plus, Trash2 } from "lucide-vue-next";
import {
  LewButton,
  LewDialog,
  LewForm,
  LewMessage,
  LewModal,
  LewPagination,
  LewTable,
} from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { createPost, deletePost, updatePost } from "~/api/system/posts";
import { useTable } from "~/composables/useTable";
import { formatDateTime } from "~/composables/useFormat";
import type { Post } from "~/types/api";
import { renderStatus } from "~/utils/render";

// ---------- 列表 ----------
const { items, loading, currentPage, pageSize, total, search, refresh, handleChange } =
  useTable<Post>({ url: "/system/posts" });

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  { title: "岗位名称", field: "name", width: 180 },
  { title: "岗位标识", field: "key", width: 180 },
  { title: "排序", field: "sort", width: 80 },
  {
    title: "状态",
    field: "status",
    width: 90,
    customRender: ({ row }) => renderStatus((row as { status: string }).status),
  },
  { title: "备注", field: "remark" },
  {
    title: "创建时间",
    field: "createdAt",
    width: 170,
    customRender: ({ row }) => formatDateTime((row as unknown as Post).createdAt),
  },
  { title: "操作", field: "operation", width: 100, fixed: "right" },
];

void search();

// ---------- 新增/编辑 ----------
const modalVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref();
const form = ref({ name: "", key: "", sort: 0, status: "active", remark: "" });

const statusOptions = [
  { label: "启用", value: "active" },
  { label: "禁用", value: "disabled" },
];

function openCreate() {
  editingId.value = null;
  form.value = { name: "", key: "", sort: 0, status: "active", remark: "" };
  modalVisible.value = true;
}

function openEdit(row: Post) {
  editingId.value = row.id;
  form.value = {
    name: row.name,
    key: row.key,
    sort: row.sort,
    status: row.status,
    remark: row.remark ?? "",
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  const body = {
    name: form.value.name,
    key: form.value.key,
    sort: form.value.sort,
    status: form.value.status as "active" | "disabled",
    remark: form.value.remark || undefined,
  };
  if (editingId.value === null) {
    await createPost(body);
    LewMessage.success("创建成功");
  } else {
    await updatePost(editingId.value, body);
    LewMessage.success("更新成功");
  }
  modalVisible.value = false;
  void refresh();
}

// ---------- 删除 ----------
function handleDelete(row: Post) {
  LewDialog.warning({
    title: "删除确认",
    content: `确定删除岗位「${row.name}」吗？`,
    onOk: async () => {
      await deletePost(row.id);
      LewMessage.success("删除成功");
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
        <h2 class="page-title m-0">岗位管理</h2>
        <p class="page-subtitle mt-1 mb-0">管理岗位信息</p>
      </div>
      <LewButton v-permission="'system:post:create'" type="fill" @click="openCreate">
        <Plus :size="15" style="margin-right: 4px" /> 新增岗位
      </LewButton>
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
              v-permission="'system:post:update'"
              type="text"
              size="small"
              @click="openEdit(row as unknown as Post)"
            >
              <Pencil :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:post:delete'"
              type="text"
              size="small"
              color="error"
              @click="handleDelete(row as unknown as Post)"
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
      :title="editingId === null ? '新增岗位' : '编辑岗位'"
      width="480px"
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
          ref="formRef"
          v-model="form"
          label-width="72px"
          :options="[
            {
              field: 'name',
              label: '岗位名称',
              as: 'input',
              rule: 'Yup.string().required()',
              props: { placeholder: '请输入岗位名称', clearable: true },
            },
            {
              field: 'key',
              label: '岗位标识',
              as: 'input',
              rule: 'Yup.string().required()',
              props: { placeholder: '小写字母/数字/:-_', clearable: true },
            },
            { field: 'sort', label: '排序', as: 'input-number', props: { min: 0 } },
            { field: 'status', label: '状态', as: 'select', props: { options: statusOptions } },
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
  </div>
</template>
