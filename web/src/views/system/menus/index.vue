<script setup lang="ts">
import { computed, h, nextTick, reactive, ref } from "vue";
import { ChevronDown, ChevronUp, CornerDownRight, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { LewButton, LewForm, LewMessage, LewModal, LewTable } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { createMenu, deleteMenu, listMenus, updateMenu } from "~/api/system/menus";
import type { Menu, MenuType } from "~/types/api";
import { renderStatus } from "~/utils/render";
import { confirmDanger } from "~/utils/confirm";

// ---------- 菜单树 ----------
const menus = ref<Menu[]>([]);
const loading = ref(false);

/** 扁平化树为带层级深度的列表（供 LewTable 渲染，LewTable 不支持树形数据） */
type FlatMenu = { menu: Menu; depth: number };

const flatMenus = computed<FlatMenu[]>(() => {
  const result: FlatMenu[] = [];
  const walk = (list: Menu[], depth: number) => {
    for (const menu of list) {
      result.push({ menu, depth });
      if (menu.children?.length) walk(menu.children, depth + 1);
    }
  };
  walk(menus.value, 0);
  return result;
});

const columns: LewTableColumn[] = [
  {
    title: "名称",
    field: "title",
    width: 240,
    customRender: ({ row }) => {
      const { menu, depth } = row as unknown as FlatMenu;
      return h("span", { class: "inline-flex items-center gap-1" }, [
        depth > 0
          ? h(CornerDownRight, {
              size: 13,
              style: `margin-left: ${(depth - 1) * 20}px; color: var(--app-text-muted)`,
            })
          : null,
        h(
          "span",
          {
            class: depth > 0 ? "text-12.5px" : "text-13px font-600",
          },
          menu.title,
        ),
      ]);
    },
  },
  {
    title: "类型",
    field: "type",
    width: 90,
    customRender: ({ row }) => {
      const { menu } = row as unknown as FlatMenu;
      const map: Record<MenuType, string> = { M: "目录", C: "菜单", F: "按钮" };
      return h("span", {}, map[menu.type]);
    },
  },
  {
    title: "路由路径",
    field: "path",
    width: 180,
    customRender: ({ row }) => h("span", {}, (row as unknown as FlatMenu).menu.path ?? "-"),
  },
  {
    title: "组件",
    field: "component",
    width: 200,
    customRender: ({ row }) => h("span", {}, (row as unknown as FlatMenu).menu.component ?? "-"),
  },
  {
    title: "权限标识",
    field: "permission",
    width: 200,
    customRender: ({ row }) => h("span", {}, (row as unknown as FlatMenu).menu.permission ?? "-"),
  },
  {
    title: "排序",
    field: "sort",
    width: 120,
    customRender: ({ row }) => {
      const { menu } = row as unknown as FlatMenu;
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
        h(
          "span",
          { class: "text-12.5px text-[var(--app-text-secondary)] w-16px text-center" },
          String(menu.sort),
        ),
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
    customRender: ({ row }) => renderStatus((row as unknown as FlatMenu).menu.status),
  },
  { title: "操作", field: "operation", width: 120, fixed: "right" },
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
function flattenWithPath(list: Menu[], path: number[] = []): { menu: Menu; path: number[] }[] {
  return list.flatMap((menu, index) => {
    const current = [...path, index];
    const children = menu.children?.length ? flattenWithPath(menu.children, current) : [];
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
/** 上级菜单下拉框里的“根目录”哨兵值（LewSelect 对假值 0 不显示选中标签） */
const ROOT_PARENT = -1;
const form = ref({
  parentId: ROOT_PARENT,
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
/** 表单 key：每次打开弹窗自增，强制重建 LewForm 以回填数据 */
const formKey = ref(0);

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

const parentOptions = reactive<{ label: string; value: number }[]>([]);

function openCreate(parentId = 0) {
  editingId.value = null;
  parentOptions.splice(
    0,
    parentOptions.length,
    { label: "根目录", value: ROOT_PARENT },
    ...flattenMenus(menus.value),
  );
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({
      parentId: parentId === 0 ? ROOT_PARENT : parentId,
      name: "",
      title: "",
      type: "M",
      path: "",
      component: "",
      permission: "",
      icon: "",
      sort: 0,
      status: "active",
    });
  });
}

function openEdit(row: Menu) {
  editingId.value = row.id;
  parentOptions.splice(
    0,
    parentOptions.length,
    { label: "根目录", value: ROOT_PARENT },
    ...flattenMenus(menus.value),
  );
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({
      parentId: row.parentId === 0 ? ROOT_PARENT : row.parentId,
      name: row.name,
      title: row.title,
      type: row.type,
      path: row.path ?? "",
      component: row.component ?? "",
      permission: row.permission ?? "",
      icon: row.icon ?? "",
      sort: row.sort,
      status: row.status,
    });
  });
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  const values = (formRef.value?.getForm?.() ?? form.value) as typeof form.value;
  const body = {
    parentId: values.parentId === ROOT_PARENT ? 0 : values.parentId,
    name: values.name,
    title: values.title,
    type: values.type,
    path: values.path || undefined,
    component: values.component || undefined,
    permission: values.permission || undefined,
    icon: values.icon || undefined,
    sort: values.sort,
    status: values.status as "active" | "disabled",
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
  confirmDanger({
    title: "删除确认",
    content: `确定删除菜单「${row.title}」吗？`,
    onConfirm: async () => {
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
      <LewTable
        :columns="columns"
        :data-source="flatMenus"
        :loading="loading"
        :focusable="false"
        size="small"
        row-key="menu.id"
      >
        <template #operation="{ row }">
          <div class="flex items-center gap-1">
            <LewButton
              v-permission="'system:menu:create'"
              type="text"
              size="small"
              title="添加子菜单"
              @click="openCreate((row as unknown as FlatMenu).menu.id)"
            >
              <Plus :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:menu:update'"
              type="text"
              size="small"
              @click="openEdit((row as unknown as FlatMenu).menu)"
            >
              <Pencil :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:menu:delete'"
              type="text"
              size="small"
              color="error"
              @click="handleDelete((row as unknown as FlatMenu).menu)"
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
              label: '上级菜单',
              as: 'select',
              props: { options: parentOptions },
            },
            {
              field: 'type',
              label: '类型',
              as: 'select',
              rule: `Yup.string().required('不能为空')`,
              props: { options: typeOptions },
            },
            {
              field: 'name',
              label: '路由名称',
              as: 'input',
              rule: `Yup.string().required('不能为空')`,
              props: { placeholder: '如 system', clearable: true },
            },
            {
              field: 'title',
              label: '菜单标题',
              as: 'input',
              rule: `Yup.string().required('不能为空')`,
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
      </div>
    </LewModal>
  </div>
</template>
