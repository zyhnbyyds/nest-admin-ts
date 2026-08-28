<script setup lang="ts">
import { h, ref } from "vue";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { LewButton, LewDialog, LewForm, LewMessage, LewModal, LewTable } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { createMenu, deleteMenu, listMenus, updateMenu } from "~/api/system/menus";
import type { Menu, MenuType } from "~/types/api";
import { renderStatus } from "~/utils/render";

// ---------- 菜单树 ----------
const menus = ref<Menu[]>([]);
const loading = ref(false);

const columns: LewTableColumn[] = [
  { title: "名称", field: "title", width: 200 },
  { title: "类型", field: "type", width: 90 },
  { title: "路由路径", field: "path", width: 180 },
  { title: "组件", field: "component", width: 200 },
  { title: "权限标识", field: "permission", width: 200 },
  {
    title: "排序",
    field: "sort",
    width: 120,
    customRender: ({ row }) => {
      const menu = row as unknown as Menu;
      return h("div", { class: "flex items-center gap-1" }, [
        h(
          "button",
          {
            class: "icon-btn !w-22px !h-22px",
            title: "上移",
            disabled: movingId.value !== null,
            onClick: () => moveMenu(menu, -1),
          },
          [h(ChevronUp, { size: 14 })],
        ),
        h("span", { class: "text-12.5px text-[var(--app-text-secondary)] w-16px text-center" }, String(menu.sort)),
        h(
          "button",
          {
            class: "icon-btn !w-22px !h-22px",
            title: "下移",
            disabled: movingId.value !== null,
            onClick: () => moveMenu(menu, 1),
          },
          [h(ChevronDown, { size: 14 })],
        ),
      ]);
    },
  },
  {
    title: "状态",
    field: "status",
    width: 90,
    customRender: ({ row }) => renderStatus((row as { status: string }).status),
  },
];

async function fetchList() {
  loading.value = true;
  try {
    menus.value = await listMenus();
  } finally {
    loading.value = false;
  }
}

void fetchList();

// ---------- 同级排序（上移/下移） ----------
const movingId = ref<number | null>(null);

/** 扁平化树为带层级路径的列表 */
function flattenWithPath(
  list: Menu[],
  path: number[] = [],
): { menu: Menu; path: number[] }[] {
  return list.flatMap((menu, index) => {
    const current = [...path, index];
    const children = menu.children?.length
      ? flattenWithPath(menu.children, current)
      : [];
    return [{ menu, path: current }, ...children];
  });
}

function findSiblings(list: Menu[], path: number[]): Menu[] {
  let node = list;
  for (let i = 0; i < path.length - 1; i++) {
    node = node[path[i]!]!.children ?? [];
  }
  return node;
}

async function moveMenu(menu: Menu, direction: -1 | 1) {
  const flat = flattenWithPath(menus.value);
  const item = flat.find((entry) => entry.menu.id === menu.id);
  if (!item) return;
  const siblings = findSiblings(menus.value, item.path);
  const index = siblings.findIndex((entry) => entry.id === menu.id);
  const targetIndex = index + direction;
  if (index === -1 || targetIndex < 0 || targetIndex >= siblings.length) return;

  movingId.value = menu.id;
  try {
    // 交换 sort 值
    const target = siblings[targetIndex]!;
    await Promise.all([
      updateMenu(menu.id, { sort: target.sort }),
      updateMenu(target.id, { sort: menu.sort }),
    ]);
    LewMessage.success("排序已更新");
    void fetchList();
  } finally {
    movingId.value = null;
  }
}

// ---------- 新增/编辑 ----------
const modalVisible = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref();
const form = ref({
  parentId: 0,
  name: "",
  title: "",
  type: "M" as MenuType,
  path: "",
  component: "",
  permission: "",
  icon: "",
  sort: 0,
  status: "active",
});

const typeOptions = [
  { label: "目录", value: "M" },
  { label: "菜单", value: "C" },
  { label: "按钮", value: "F" },
];

const statusOptions = [
  { label: "启用", value: "active" },
  { label: "禁用", value: "disabled" },
];

/** 扁平化菜单树供父级选择 */
function flattenMenus(list: Menu[], prefix = ""): { label: string; value: number }[] {
  return list.flatMap((menu) => {
    const label = `${prefix}${menu.title}`;
    const self = { label, value: menu.id };
    const children = menu.children?.length ? flattenMenus(menu.children, `${label} / `) : [];
    return [self, ...children];
  });
}

const parentOptions = ref<{ label: string; value: number }[]>([]);

function openCreate(parentId = 0) {
  editingId.value = null;
  parentOptions.value = [{ label: "根目录", value: 0 }, ...flattenMenus(menus.value)];
  form.value = {
    parentId,
    name: "",
    title: "",
    type: "M",
    path: "",
    component: "",
    permission: "",
    icon: "",
    sort: 0,
    status: "active",
  };
  modalVisible.value = true;
}

function openEdit(row: Menu) {
  editingId.value = row.id;
  parentOptions.value = [{ label: "根目录", value: 0 }, ...flattenMenus(menus.value)];
  form.value = {
    parentId: row.parentId,
    name: row.name,
    title: row.title,
    type: row.type,
    path: row.path ?? "",
    component: row.component ?? "",
    permission: row.permission ?? "",
    icon: row.icon ?? "",
    sort: row.sort,
    status: row.status,
  };
  modalVisible.value = true;
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  const body = {
    parentId: form.value.parentId,
    name: form.value.name,
    title: form.value.title,
    type: form.value.type,
    path: form.value.path || undefined,
    component: form.value.component || undefined,
    permission: form.value.permission || undefined,
    icon: form.value.icon || undefined,
    sort: form.value.sort,
    status: form.value.status as "active" | "disabled",
  };
  if (editingId.value === null) {
    await createMenu(body);
    LewMessage.success("创建成功");
  } else {
    await updateMenu(editingId.value, body);
    LewMessage.success("更新成功");
  }
  modalVisible.value = false;
  void fetchList();
}

// ---------- 删除 ----------
function handleDelete(row: Menu) {
  LewDialog.warning({
    title: "删除确认",
    content: `确定删除菜单「${row.title}」吗？`,
    onOk: async () => {
      await deleteMenu(row.id);
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
        <h2 class="page-title m-0">菜单管理</h2>
        <p class="page-subtitle mt-1 mb-0">管理系统菜单、路由与按钮权限</p>
      </div>
      <LewButton v-permission="'system:menu:create'" type="fill" @click="openCreate(0)">
        <Plus :size="15" style="margin-right: 4px" /> 新增菜单
      </LewButton>
    </div>

    <!-- 树形表格 -->
    <div class="app-card overflow-hidden">
      <LewTable :columns="columns" :data-source="menus" :loading="loading" size="small">
        <template #operation="{ row }">
          <div class="flex items-center gap-1">
            <LewButton
              v-permission="'system:menu:create'"
              type="text"
              size="small"
              title="添加子菜单"
              @click="openCreate((row as unknown as Menu).id)"
            >
              <Plus :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:menu:update'"
              type="text"
              size="small"
              @click="openEdit(row as unknown as Menu)"
            >
              <Pencil :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:menu:delete'"
              type="text"
              size="small"
              color="error"
              @click="handleDelete(row as unknown as Menu)"
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
      :title="editingId === null ? '新增菜单' : '编辑菜单'"
      width="520px"
    >
      <LewForm
        ref="formRef"
        v-model="form"
        label-width="80px"
        :options="[
          { field: 'parentId', label: '上级菜单', as: 'select', props: { options: parentOptions } },
          {
            field: 'type',
            label: '类型',
            as: 'select',
            rule: 'required',
            props: { options: typeOptions },
          },
          {
            field: 'name',
            label: '路由名称',
            as: 'input',
            rule: 'required',
            props: { placeholder: '如 system', clearable: true },
          },
          {
            field: 'title',
            label: '菜单标题',
            as: 'input',
            rule: 'required',
            props: { placeholder: '如 系统管理', clearable: true },
          },
          {
            field: 'path',
            label: '路由路径',
            as: 'input',
            props: { placeholder: '如 /system', clearable: true },
          },
          {
            field: 'component',
            label: '组件路径',
            as: 'input',
            props: { placeholder: '如 system/users/index', clearable: true },
          },
          {
            field: 'permission',
            label: '权限标识',
            as: 'input',
            props: { placeholder: '如 system:user:list', clearable: true },
          },
          {
            field: 'icon',
            label: '图标',
            as: 'input',
            props: { placeholder: '图标名（lucide）', clearable: true },
          },
          { field: 'sort', label: '排序', as: 'input-number', props: { min: 0 } },
          { field: 'status', label: '状态', as: 'select', props: { options: statusOptions } },
        ]"
      />
      <template #footer>
        <LewButton type="light" @click="modalVisible = false">取消</LewButton>
        <LewButton type="fill" @click="handleSubmit">保存</LewButton>
      </template>
    </LewModal>
  </div>
</template>
