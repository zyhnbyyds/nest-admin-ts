<script setup lang="ts">
import { ref } from "vue";
import { KeyRound, Plus, Trash2 } from "lucide-vue-next";
import { LewButton, LewForm, LewMessage, LewModal, LewTable } from "lew-ui";
import type { LewFormOption } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { assignRoleMenus, createRole, getRoleMenuIds, listRoles } from "~/api/system/roles";
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

// ---------- 新增弹窗 ----------
const modalVisible = ref(false);
const formRef = ref();
const form = ref({ name: "", key: "", sort: 0, remark: "" });

const formOptions: LewFormOption[] = [
  {
    field: "name",
    label: "角色名称",
    as: "input",
    rule: "required",
    props: { placeholder: "请输入角色名称", clearable: true },
  },
  {
    field: "key",
    label: "角色标识",
    as: "input",
    rule: "required",
    props: { placeholder: "小写字母/数字/:-_", clearable: true },
  },
  { field: "sort", label: "排序", as: "input-number", props: { min: 0 } },
  { field: "remark", label: "备注", as: "textarea", props: { placeholder: "选填", rows: 2 } },
];

function openCreate() {
  form.value = { name: "", key: "", sort: 0, remark: "" };
  modalVisible.value = true;
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  await createRole({
    name: form.value.name,
    key: form.value.key,
    sort: form.value.sort,
    remark: form.value.remark || undefined,
  });
  LewMessage.success("创建成功");
  modalVisible.value = false;
  void fetchList();
}

// ---------- 分配菜单权限 ----------
const authVisible = ref(false);
const authRole = ref<Role | null>(null);
const menuTree = ref<Menu[]>([]);
const checkedKeys = ref<number[]>([]);

async function openAuth(role: Role) {
  authRole.value = role;
  authVisible.value = true;
  const [menus, ids] = await Promise.all([listMenus(), getRoleMenuIds(role.id)]);
  menuTree.value = menus;
  checkedKeys.value = ids;
}

async function handleAuthSubmit() {
  if (!authRole.value) return;
  await assignRoleMenus(authRole.value.id, { menuIds: checkedKeys.value });
  LewMessage.success("权限已更新");
  authVisible.value = false;
}

// ---------- 删除（后端未暴露角色删除接口，仅提示） ----------
function handleDelete(_row: Role) {
  LewMessage.warning("当前后端未提供角色删除接口");
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
      <LewTable :columns="columns" :data-source="roles" :loading="loading" size="small">
        <template #operation="{ row }">
          <div class="flex items-center gap-1">
            <LewButton
              v-permission="'system:role:update'"
              type="text"
              size="small"
              @click="openAuth(row as unknown as Role)"
            >
              <KeyRound :size="14" />
            </LewButton>
            <LewButton
              type="text"
              size="small"
              color="error"
              @click="handleDelete(row as unknown as Role)"
            >
              <Trash2 :size="14" />
            </LewButton>
          </div>
        </template>
      </LewTable>
    </div>

    <!-- 新增弹窗 -->
    <LewModal v-model:visible="modalVisible" title="新增角色" width="480px">
      <LewForm ref="formRef" v-model="form" :options="formOptions" label-width="72px" />
      <template #footer>
        <LewButton type="light" @click="modalVisible = false">取消</LewButton>
        <LewButton type="fill" @click="handleSubmit">创建</LewButton>
      </template>
    </LewModal>

    <!-- 分配菜单权限弹窗 -->
    <LewModal
      v-model:visible="authVisible"
      :title="`分配菜单权限 - ${authRole?.name ?? ''}`"
      width="420px"
    >
      <div class="max-h-400px overflow-y-auto">
        <p class="text-13px text-[var(--app-text-muted)] m-0 mb-2">
          勾选菜单后保存（按钮权限随其父菜单自动关联）
        </p>
        <LewTree v-model:checked-keys="checkedKeys" checkable expand-all :data-source="menuTree" />
      </div>
      <template #footer>
        <LewButton type="light" @click="authVisible = false">取消</LewButton>
        <LewButton type="fill" @click="handleAuthSubmit">保存</LewButton>
      </template>
    </LewModal>
  </div>
</template>
