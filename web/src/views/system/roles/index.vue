<script setup lang="ts">
import { nextTick, ref } from "vue";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { LewButton, LewDialog, LewForm, LewMessage, LewModal, LewTable, LewTree } from "lew-ui";
import type { LewFormOption, LewTreeDataSource } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import {
  assignRoleMenus,
  createRole,
  deleteRole,
  getRoleMenuIds,
  listRoles,
  updateRole,
} from "~/api/system/roles";
import { listMenus } from "~/api/system/menus";
import { formatDateTime } from "~/composables/useFormat";
import type { Menu, Role } from "~/types/api";
import { renderStatus } from "~/utils/render";

// ---------- 列表 ----------
const roles = ref<Role[]>([]);
const loading = ref(false);

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  { title: "角色名称", field: "name", width: 160 },
  { title: "角色标识", field: "key", width: 160 },
  { title: "排序", field: "sort", width: 80 },
  { title: "数据范围", field: "dataScope", width: 140 },
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
    customRender: ({ row }) => formatDateTime((row as unknown as Role).createdAt),
  },
  { title: "操作", field: "operation", width: 140, fixed: "right" },
];

async function fetchList() {
  loading.value = true;
  try {
    roles.value = await listRoles();
  } finally {
    loading.value = false;
  }
}

void fetchList();

// ---------- 新增/编辑弹窗 ----------
const modalVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref();
const form = ref({ name: "", key: "", sort: 0, remark: "" });
/** 表单 key：每次打开弹窗自增，强制重建 LewForm 以回填数据 */
const formKey = ref(0);

const formOptions: LewFormOption[] = [
  {
    field: "name",
    label: "角色名称",
    as: "input",
    rule: "Yup.string().required()",
    props: { placeholder: "请输入角色名称", clearable: true },
  },
  {
    field: "key",
    label: "角色标识",
    as: "input",
    rule: "Yup.string().required()",
    props: { placeholder: "小写字母/数字/:-_", clearable: true },
  },
  { field: "sort", label: "排序", as: "input-number", props: { min: 0 } },
  { field: "remark", label: "备注", as: "textarea", props: { placeholder: "选填", rows: 2 } },
];

function openCreate() {
  editingId.value = null;
  formKey.value += 1;
  modalVisible.value = true;
  // LewForm 为受控组件，需在挂载后通过 setForm 填充
  void nextTick(() => {
    formRef.value?.setForm?.({ name: "", key: "", sort: 0, remark: "" });
  });
}

function openEdit(row: Role) {
  editingId.value = row.id;
  formKey.value += 1;
  modalVisible.value = true;
  // LewForm 为受控组件，需在挂载后通过 setForm 回填现有数据
  void nextTick(() => {
    formRef.value?.setForm?.({
      name: row.name,
      key: row.key,
      sort: row.sort,
      remark: row.remark ?? "",
    });
  });
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  // 用 getForm 读取表单当前值，确保拿到用户真实输入
  const values = (formRef.value?.getForm?.() ?? form.value) as typeof form.value;
  const body = {
    name: values.name,
    key: values.key,
    sort: values.sort,
    remark: values.remark || undefined,
  };
  if (editingId.value === null) {
    await createRole(body);
    LewMessage.success("创建成功");
  } else {
    await updateRole(editingId.value, body);
    LewMessage.success("更新成功");
  }
  modalVisible.value = false;
  void fetchList();
}

// ---------- 分配菜单权限 ----------
const authVisible = ref(false);
const authRole = ref<Role | null>(null);
const menuTree = ref<LewTreeDataSource[]>([]);
const checkedKeys = ref<string[]>([]);

/** Menu[] → LewTreeDataSource[]（key 用菜单 id 字符串） */
function toTreeData(list: Menu[]): LewTreeDataSource[] {
  return list.map((menu) => ({
    label: menu.title,
    key: String(menu.id),
    level: 0,
    allNodeValues: [],
    leafNodeValues: [],
    children: menu.children?.length ? toTreeData(menu.children) : undefined,
  }));
}

async function openAuth(role: Role) {
  authRole.value = role;
  // 先加载数据，再打开弹窗（LewTree 只在挂载时读取 dataSource，不会响应后续变化）
  const [menus, ids] = await Promise.all([listMenus(), getRoleMenuIds(role.id)]);
  menuTree.value = toTreeData(menus);
  checkedKeys.value = ids.map(String);
  authVisible.value = true;
}

async function handleAuthSubmit() {
  if (!authRole.value) return;
  await assignRoleMenus(authRole.value.id, { menuIds: checkedKeys.value.map(Number) });
  LewMessage.success("权限已更新");
  authVisible.value = false;
}

// ---------- 删除角色 ----------
function handleDelete(row: Role) {
  LewDialog.warning({
    title: "删除确认",
    content: `确定删除角色「${row.name}」吗？此操作不可恢复。`,
    onOk: async () => {
      await deleteRole(row.id);
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
        <h2 class="page-title m-0">角色管理</h2>
        <p class="page-subtitle mt-1 mb-0">管理系统角色与菜单权限</p>
      </div>
      <LewButton v-permission="'system:role:create'" type="fill" @click="openCreate">
        <Plus :size="15" style="margin-right: 4px" /> 新增角色
      </LewButton>
    </div>

    <!-- 表格 -->
    <div class="app-card overflow-hidden">
      <LewTable
        :columns="columns"
        :data-source="roles"
        :loading="loading"
        :focusable="false"
        size="small"
      >
        <template #operation="{ row }">
          <div class="flex items-center gap-1">
            <LewButton
              v-permission="'system:role:update'"
              type="text"
              size="small"
              title="编辑角色"
              @click="openEdit(row as unknown as Role)"
            >
              <Pencil :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:role:update'"
              type="text"
              size="small"
              title="分配菜单权限"
              @click="openAuth(row as unknown as Role)"
            >
              <KeyRound :size="14" />
            </LewButton>
            <LewButton
              type="text"
              size="small"
              color="error"
              title="删除角色"
              @click="handleDelete(row as unknown as Role)"
            >
              <Trash2 :size="14" />
            </LewButton>
          </div>
        </template>
      </LewTable>
    </div>

    <!-- 新增/编辑弹窗 -->
    <LewModal
      v-model:visible="modalVisible"
      :title="editingId === null ? '新增角色' : '编辑角色'"
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
            text: editingId === null ? '创建' : '保存',
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
          :options="formOptions"
          label-width="72px"
        />
      </div>
    </LewModal>

    <!-- 分配菜单权限弹窗 -->
    <LewModal
      v-model:visible="authVisible"
      :title="`分配菜单权限 - ${authRole?.name ?? ''}`"
      width="420px"
      :footer-buttons="[
        {
          props: {
            type: 'text',
            color: 'gray',
            size: 'small',
            text: '取消',
            request: () => {
              authVisible = false;
            },
          },
        },
        {
          props: {
            type: 'fill',
            color: 'primary',
            size: 'small',
            text: '保存',
            request: handleAuthSubmit,
          },
        },
      ]"
    >
      <div class="p-5">
        <div class="max-h-400px overflow-y-auto">
          <p class="text-13px text-[var(--app-text-muted)] m-0 mb-2">
            勾选菜单后保存（按钮权限随其父菜单自动关联）
          </p>
          <LewTree v-model="checkedKeys" checkable expand-all :data-source="menuTree" />
        </div>
      </div>
    </LewModal>
  </div>
</template>
