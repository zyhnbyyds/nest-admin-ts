<script setup lang="ts">
import { nextTick, reactive, ref } from "vue";
import { Pencil, Plus, Trash2 } from "lucide-vue-next";
import { LewButton, LewForm, LewMessage, LewModal, LewTable } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { createDept, deleteDept, listDepts, updateDept } from "~/api/system/depts";
import type { CreateDeptBody, Dept } from "~/types/api";
import { renderStatus } from "~/utils/render";
import { confirmDanger } from "~/utils/confirm";
import IconButton from "~/components/IconButton.vue";

// ---------- 部门树 ----------
const depts = ref<Dept[]>([]);
const loading = ref(false);

const columns: LewTableColumn[] = [
  { title: "部门名称", field: "name", width: 220 },
  { title: "排序", field: "sort", width: 80 },
  { title: "负责人ID", field: "leaderUserId", width: 110 },
  { title: "联系电话", field: "phone", width: 140 },
  { title: "邮箱", field: "email" },
  {
    title: "状态",
    field: "status",
    width: 90,
    customRender: ({ row }) => renderStatus((row as { status: string }).status),
  },
  { title: "操作", field: "operation", width: 120, fixed: "right" },
];

async function fetchList() {
  loading.value = true;
  try {
    depts.value = await listDepts();
  } finally {
    loading.value = false;
  }
}

void fetchList();

// ---------- 新增/编辑 ----------
const modalVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref();
/** 上级部门下拉框里的“根部门”哨兵值（LewSelect 对假值 0 不显示选中标签） */
const ROOT_PARENT = -1;
const form = ref({
  parentId: ROOT_PARENT,
  name: "",
  sort: 0,
  leaderUserId: undefined as number | undefined,
  phone: "",
  email: "",
  status: true,
});
/** 表单 key：每次打开弹窗自增，强制重建 LewForm 以回填数据 */
const formKey = ref(0);

function flattenDepts(list: Dept[], prefix = ""): { label: string; value: number }[] {
  return list.flatMap((dept) => {
    const label = `${prefix}${dept.name}`;
    const self = { label, value: dept.id };
    const children = dept.children?.length ? flattenDepts(dept.children, `${label} / `) : [];
    return [self, ...children];
  });
}

const parentOptions = reactive<{ label: string; value: number }[]>([]);

function openCreate(parentId = 0) {
  editingId.value = null;
  parentOptions.splice(
    0,
    parentOptions.length,
    { label: "根部门", value: ROOT_PARENT },
    ...flattenDepts(depts.value),
  );
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({
      parentId: parentId === 0 ? ROOT_PARENT : parentId,
      name: "",
      sort: 0,
      leaderUserId: undefined,
      phone: "",
      email: "",
      status: true,
    });
  });
}

function openEdit(row: Dept) {
  editingId.value = row.id;
  parentOptions.splice(
    0,
    parentOptions.length,
    { label: "根部门", value: ROOT_PARENT },
    ...flattenDepts(depts.value),
  );
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({
      parentId: row.parentId === 0 ? ROOT_PARENT : row.parentId,
      name: row.name,
      sort: row.sort,
      leaderUserId: row.leaderUserId ?? undefined,
      phone: row.phone ?? "",
      email: row.email ?? "",
      status: row.status === "active",
    });
  });
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  const values = (formRef.value?.getForm?.() ?? form.value) as typeof form.value;
  const body: CreateDeptBody = {
    parentId: values.parentId === ROOT_PARENT ? 0 : values.parentId,
    name: values.name,
    sort: values.sort,
    leaderUserId: values.leaderUserId,
    phone: values.phone || undefined,
    email: values.email || undefined,
    status: values.status ? "active" : "disabled",
  };
  if (editingId.value === null) {
    await createDept(body);
    LewMessage.success("创建成功");
  } else {
    await updateDept(editingId.value, body);
    LewMessage.success("更新成功");
  }
  modalVisible.value = false;
  void fetchList();
}

// ---------- 删除 ----------
function handleDelete(row: Dept) {
  confirmDanger({
    title: "删除确认",
    content: `确定删除部门「${row.name}」吗？`,
    onConfirm: async () => {
      await deleteDept(row.id);
      LewMessage.success("删除成功");
      void fetchList();
    },
  });
}
</script>

<template>
  <div class="page-container">
    <!-- 页头 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="page-title m-0">部门管理</h2>
        <p class="page-subtitle mt-1 mb-0">管理组织架构部门</p>
      </div>
      <LewButton v-permission="'system:dept:create'" type="fill" @click="openCreate(0)">
        <Plus :size="15" style="margin-right: 4px" /> 新增部门
      </LewButton>
    </div>

    <!-- 树形表格 -->
    <div class="app-card overflow-hidden">
      <LewTable
        :columns="columns"
        :data-source="depts"
        :loading="loading"
        :focusable="false"
        size="small"
      >
        <template #operation="{ row }">
          <div class="flex items-center gap-1">
            <IconButton
              permission="system:dept:create"
              title="添加子部门"
              @click="openCreate((row as unknown as Dept).id)"
            >
              <Plus :size="14" />
            </IconButton>
            <IconButton
              permission="system:dept:update"
              title="编辑"
              @click="openEdit(row as unknown as Dept)"
            >
              <Pencil :size="14" />
            </IconButton>
            <IconButton
              permission="system:dept:delete"
              color="error"
              title="删除"
              @click="handleDelete(row as unknown as Dept)"
            >
              <Trash2 :size="14" />
            </IconButton>
          </div>
        </template>
      </LewTable>
    </div>

    <!-- 新增/编辑弹窗 -->
    <LewModal
      v-model:visible="modalVisible"
      :title="editingId === null ? '新增部门' : '编辑部门'"
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
          label-width="80px"
          :options="[
            {
              field: 'parentId',
              label: '上级部门',
              as: 'select',
              props: { options: parentOptions },
            },
            {
              field: 'name',
              label: '部门名称',
              as: 'input',
              rule: `Yup.string().required('不能为空')`,
              props: { placeholder: '请输入部门名称', clearable: true },
            },
            { field: 'sort', label: '排序', as: 'input-number', props: { min: 0 } },
            {
              field: 'leaderUserId',
              label: '负责人ID',
              as: 'input-number',
              props: { min: 1, placeholder: '选填' },
            },
            {
              field: 'phone',
              label: '联系电话',
              as: 'input',
              props: { placeholder: '选填', clearable: true },
            },
            {
              field: 'email',
              label: '邮箱',
              as: 'input',
              props: { placeholder: '选填', clearable: true },
            },
            { field: 'status', label: '状态', as: 'switch' },
          ]"
        />
      </div>
    </LewModal>
  </div>
</template>
