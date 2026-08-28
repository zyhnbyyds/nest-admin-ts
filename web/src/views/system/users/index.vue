<script setup lang="ts">
import { ref } from "vue";
import { Pencil, Plus, Trash2 } from "lucide-vue-next";
import {
  LewButton,
  LewDialog,
  LewForm,
  LewInput,
  LewMessage,
  LewModal,
  LewPagination,
  LewTable,
} from "lew-ui";
import type { LewFormOption } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { createUser, deleteUser, updateUser } from "~/api/system/users";
import { useTable } from "~/composables/useTable";
import { formatDateTime } from "~/composables/useFormat";
import type { User } from "~/types/api";
import { renderStatus } from "~/utils/render";

// ---------- 列表 ----------
const query = ref<{ status?: string }>({});
const { items, loading, currentPage, pageSize, total, search, refresh, handleChange } =
  useTable<User>({ url: "/system/users", query: () => query.value });

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  { title: "用户名", field: "username", width: 140 },
  { title: "显示名称", field: "displayName", width: 140 },
  { title: "邮箱", field: "email" },
  { title: "手机号", field: "phone", width: 130 },
  {
    title: "状态",
    field: "status",
    width: 90,
    customRender: ({ row }) => renderStatus((row as { status: string }).status),
  },
  {
    title: "创建时间",
    field: "createdAt",
    width: 170,
    customRender: ({ row }) => formatDateTime((row as unknown as User).createdAt),
  },
  {
    title: "最近登录",
    field: "loginAt",
    width: 170,
    customRender: ({ row }) => formatDateTime((row as unknown as User).loginAt),
  },
  { title: "操作", field: "operation", width: 100, fixed: "right" },
];

void search();

// ---------- 新增/编辑弹窗 ----------
const modalVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref();
const form = ref({
  username: "",
  displayName: "",
  password: "",
  email: "",
  phone: "",
  status: "active",
});

const formOptions: LewFormOption[] = [
  {
    field: "username",
    label: "用户名",
    as: "input",
    rule: "Yup.string().required()",
    props: { placeholder: "3-64 个字符", clearable: true },
  },
  {
    field: "displayName",
    label: "显示名称",
    as: "input",
    rule: "Yup.string().required()",
    props: { placeholder: "请输入显示名称", clearable: true },
  },
  {
    field: "password",
    label: "密码",
    as: "input",
    rule: "Yup.string().required()",
    props: { type: "password", placeholder: "最少 12 位", clearable: true, showPassword: true },
  },
  { field: "email", label: "邮箱", as: "input", props: { placeholder: "选填", clearable: true } },
  { field: "phone", label: "手机号", as: "input", props: { placeholder: "选填", clearable: true } },
];

function openCreate() {
  editingId.value = null;
  form.value = {
    username: "",
    displayName: "",
    password: "",
    email: "",
    phone: "",
    status: "active",
  };
  modalVisible.value = true;
}

function openEdit(row: User) {
  editingId.value = row.id;
  form.value = {
    username: row.username,
    displayName: row.displayName,
    password: "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    status: row.status,
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  if (editingId.value === null) {
    await createUser({
      username: form.value.username,
      displayName: form.value.displayName,
      password: form.value.password,
      email: form.value.email || undefined,
      phone: form.value.phone || undefined,
    });
    LewMessage.success("创建成功");
  } else {
    await updateUser(editingId.value, {
      displayName: form.value.displayName,
      email: form.value.email || null,
      phone: form.value.phone || null,
      status: form.value.status as "active" | "disabled",
    });
    LewMessage.success("更新成功");
  }
  modalVisible.value = false;
  void refresh();
}

// ---------- 删除 ----------
function handleDelete(row: User) {
  LewDialog.warning({
    title: "删除确认",
    content: `确定删除用户「${row.displayName}」吗？此操作不可恢复。`,
    onOk: async () => {
      await deleteUser(row.id);
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
        <h2 class="page-title m-0">用户管理</h2>
        <p class="page-subtitle mt-1 mb-0">管理系统用户账号</p>
      </div>
      <LewButton v-permission="'system:user:create'" type="fill" @click="openCreate">
        <Plus :size="15" style="margin-right: 4px" /> 新增用户
      </LewButton>
    </div>

    <!-- 搜索栏 -->
    <div class="app-card flex items-center gap-3 p-4">
      <LewInput
        v-model="query.status"
        width="200px"
        placeholder="按状态筛选（active/disabled）"
        clearable
        @keydown.enter="search()"
      />
      <LewButton type="light" :loading="loading" @click="search()">查询</LewButton>
    </div>

    <!-- 表格 -->
    <div class="app-card overflow-hidden">
      <LewTable :columns="columns" :data-source="items" :loading="loading" size="small">
        <template #operation="{ row }">
          <div class="flex items-center gap-1">
            <LewButton
              v-permission="'system:user:update'"
              type="text"
              size="small"
              @click="openEdit(row as unknown as User)"
            >
              <Pencil :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:user:delete'"
              type="text"
              size="small"
              color="error"
              @click="handleDelete(row as unknown as User)"
            >
              <Trash2 :size="14" />
            </LewButton>
          </div>
        </template>
      </LewTable>

      <!-- 分页 -->
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
      :title="editingId === null ? '新增用户' : '编辑用户'"
      width="480px"
    >
      <LewForm ref="formRef" v-model="form" :options="formOptions" label-width="72px" />
      <template v-if="editingId !== null" #footer>
        <LewButton type="light" @click="modalVisible = false">取消</LewButton>
        <LewButton type="fill" @click="handleSubmit">保存</LewButton>
      </template>
      <template v-else #footer>
        <LewButton type="light" @click="modalVisible = false">取消</LewButton>
        <LewButton type="fill" @click="handleSubmit">创建</LewButton>
      </template>
    </LewModal>
  </div>
</template>
