<script setup lang="ts">
import { nextTick, ref } from "vue";
import { Pencil, Plus, Trash2 } from "lucide-vue-next";
import {
  LewButton,
  LewForm,
  LewMessage,
  LewModal,
  LewPagination,
  LewTable,
} from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { createConfig, deleteConfig, updateConfig } from "~/api/system/configs";
import { useTable } from "~/composables/useTable";
import { formatDateTime } from "~/composables/useFormat";
import type { Config } from "~/types/api";
import { confirmDanger } from "~/utils/confirm";

// ---------- 列表 ----------
const { items, loading, currentPage, pageSize, total, search, refresh, handleChange } =
  useTable<Config>({ url: "/system/configs" });

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  { title: "参数名称", field: "name", width: 180 },
  { title: "参数键名", field: "key", width: 200 },
  { title: "参数值", field: "value" },
  {
    title: "内置",
    field: "builtin",
    width: 80,
    customRender: ({ row }) => ((row as unknown as Config).builtin ? "是" : "否"),
  },
  { title: "备注", field: "remark" },
  {
    title: "创建时间",
    field: "createdAt",
    width: 170,
    customRender: ({ row }) => formatDateTime((row as unknown as Config).createdAt),
  },
  { title: "操作", field: "operation", width: 100, fixed: "right" },
];

void search();

// ---------- 新增/编辑 ----------
const modalVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref();
const form = ref({ name: "", key: "", value: "", builtin: false, remark: "" });
/** 表单 key：每次打开弹窗自增，强制重建 LewForm 以回填数据 */
const formKey = ref(0);

function openCreate() {
  editingId.value = null;
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({ name: "", key: "", value: "", builtin: false, remark: "" });
  });
}

function openEdit(row: Config) {
  editingId.value = row.id;
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({
      name: row.name,
      key: row.key,
      value: row.value,
      builtin: row.builtin,
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
    key: values.key,
    value: values.value,
    builtin: values.builtin,
    remark: values.remark || undefined,
  };
  if (editingId.value === null) {
    await createConfig(body);
    LewMessage.success("创建成功");
  } else {
    await updateConfig(editingId.value, body);
    LewMessage.success("更新成功");
  }
  modalVisible.value = false;
  void refresh();
}

// ---------- 删除 ----------
function handleDelete(row: Config) {
  confirmDanger({
    title: "删除确认",
    content: `确定删除参数「${row.name}」吗？`,
    onConfirm: async () => {
      await deleteConfig(row.id);
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
        <h2 class="page-title m-0">参数配置</h2>
        <p class="page-subtitle mt-1 mb-0">管理系统运行参数</p>
      </div>
      <LewButton v-permission="'system:config:create'" type="fill" @click="openCreate">
        <Plus :size="15" style="margin-right: 4px" /> 新增参数
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
              v-permission="'system:config:update'"
              type="text"
              size="small"
              @click="openEdit(row as unknown as Config)"
            >
              <Pencil :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:config:delete'"
              type="text"
              size="small"
              color="error"
              @click="handleDelete(row as unknown as Config)"
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
      :title="editingId === null ? '新增参数' : '编辑参数'"
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
          :key="formKey"
          ref="formRef"
          v-model="form"
          label-width="72px"
          :options="[
            {
              field: 'name',
              label: '参数名称',
              as: 'input',
              rule: 'Yup.string().required()',
              props: { placeholder: '如 系统名称', clearable: true },
            },
            {
              field: 'key',
              label: '参数键名',
              as: 'input',
              rule: 'Yup.string().required()',
              props: { placeholder: '如 sys.name', clearable: true },
            },
            {
              field: 'value',
              label: '参数值',
              as: 'input',
              rule: 'Yup.string().required()',
              props: { placeholder: '请输入参数值', clearable: true },
            },
            { field: 'builtin', label: '是否内置', as: 'switch' },
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
