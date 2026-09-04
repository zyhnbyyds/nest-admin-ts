<script setup lang="ts">
import { computed, h, nextTick, reactive, ref } from "vue";
import {
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  KeyRound,
  Pencil,
  Plus,
  Trash2,
} from "lucide-vue-next";
import { LewButton, LewForm, LewMessage, LewModal, LewTable } from "lew-ui";
import type { LewFormOption, LewTableColumn } from "lew-ui";
import { createMenu, deleteMenu, listMenus, updateMenu } from "~/api/system/menus";
import type { CreateMenuBody, Menu, MenuType } from "~/types/api";
import { renderStatus } from "~/utils/render";
import { MENU_ICON_OPTIONS, resolveMenuIcon } from "~/utils/menu-icon";
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

/** 取当前行的 menu（模板操作列内使用） */
function menuOf(row: unknown): Menu {
  return (row as FlatMenu).menu;
}

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
        menu.icon
          ? h(resolveMenuIcon(menu.icon), { size: 14, style: "color: var(--app-text-muted)" })
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
  { title: "操作", field: "operation", width: 170, fixed: "right" },
];

async function fetchList() {
  loading.value = true;
  try {
    menus.value = await listMenus();
    syncBtnAuthMenu();
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
/** 当前表单的类型（供弹窗标题等使用，跟随表单 @change 更新） */
const formType = ref<MenuType>("M");
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
  sort: 0,
  status: true,
});
/** 图标字段独立于 LewForm 管理（LewForm 选项不支持自定义控件） */
const icon = ref("");
/** 表单 key：每次打开弹窗自增，强制重建 LewForm 以回填数据 */
const formKey = ref(0);

const typeOptions = [
  { label: "目录", value: "M" },
  { label: "菜单", value: "C" },
  { label: "按钮", value: "F" },
];

const typeLabels: Record<MenuType, string> = { M: "目录", C: "菜单", F: "按钮" };

const modalTitle = computed(() => {
  const type = formType.value;
  return `${editingId.value === null ? "新增" : "编辑"}${typeLabels[type]}`;
});

/** 树中查找指定菜单节点 */
function findMenuById(list: Menu[], id: number): Menu | null {
  for (const menu of list) {
    if (menu.id === id) return menu;
    const found = findMenuById(menu.children ?? [], id);
    if (found) return found;
  }
  return null;
}

/** 收集 id 节点的全部下级 id（按钮权限弹窗同步用） */
function collectDescendantIds(list: Menu[], id: number): Set<number> {
  const result = new Set<number>();
  const node = findMenuById(list, id);
  if (!node) return result;
  const walk = (menu: Menu) => {
    for (const child of menu.children ?? []) {
      result.add(child.id);
      walk(child);
    }
  };
  walk(node);
  return result;
}

/** 上级菜单下拉选项：排除按钮（F）与指定 id 集合（编辑时排除自身及后代） */
function flattenMenuOptions(
  list: Menu[],
  excludeIds: Set<number> = new Set(),
): { label: string; value: number }[] {
  const walk = (nodes: Menu[], prefix: string): { label: string; value: number }[] =>
    nodes.flatMap((menu) => {
      if (menu.type === "F" || excludeIds.has(menu.id)) return [];
      const label = `${prefix}${menu.title}`;
      const self = { label, value: menu.id };
      return [self, ...walk(menu.children ?? [], `${label} / `)];
    });
  return walk(list, "");
}

const parentOptions = reactive<{ label: string; value: number }[]>([]);

function openCreate(parentId = 0, presetType: MenuType = "M") {
  editingId.value = null;
  parentOptions.splice(
    0,
    parentOptions.length,
    { label: "根目录", value: ROOT_PARENT },
    ...flattenMenuOptions(menus.value),
  );
  formType.value = presetType;
  icon.value = "";
  formKey.value += 1;
  modalVisible.value = true;
  void nextTick(() => {
    formRef.value?.setForm?.({
      parentId: parentId === 0 ? ROOT_PARENT : parentId,
      name: "",
      title: "",
      type: presetType,
      path: "",
      component: "",
      permission: "",
      sort: 0,
      status: true,
    });
  });
}

function openEdit(row: Menu) {
  editingId.value = row.id;
  // 上级菜单下拉排除自身及其后代，避免把菜单挂到自己的下级下
  const excludeIds = collectDescendantIds(menus.value, row.id);
  excludeIds.add(row.id);
  parentOptions.splice(
    0,
    parentOptions.length,
    { label: "根目录", value: ROOT_PARENT },
    ...flattenMenuOptions(menus.value, excludeIds),
  );
  formType.value = row.type;
  icon.value = row.icon ?? "";
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
      sort: row.sort,
      status: row.status === "active",
    });
  });
}

/** LewForm 值变化时同步当前类型（弹窗标题/字段显隐），以及图标选择不再参与 LewForm 模型 */
function onFormChange() {
  const data = formRef.value?.getForm?.() as { type?: MenuType } | undefined;
  if (data?.type) formType.value = data.type;
}

const formOptions: LewFormOption[] = [
  {
    field: "parentId",
    label: "上级菜单",
    as: "select",
    // 按钮固定挂在当前菜单下，不允许改父级
    disabled: (values) => values.type === "F",
    props: { options: parentOptions },
  },
  {
    field: "type",
    label: "类型",
    as: "select",
    rule: `Yup.string().required('不能为空')`,
    props: { options: typeOptions },
  },
  {
    field: "name",
    label: "路由名称",
    as: "input",
    rule: `Yup.string().required('不能为空')`,
    props: { placeholder: "如 system", clearable: true },
  },
  {
    field: "title",
    label: "菜单标题",
    as: "input",
    rule: `Yup.string().required('不能为空')`,
    props: { placeholder: "如 系统管理", clearable: true },
  },
  {
    field: "path",
    label: "路由路径",
    as: "input",
    // 按钮不需要路由路径（后端要求 M/C 必填）
    visible: (values) => values.type !== "F",
    rule: `Yup.string().when('type', { is: 'F', then: (s) => s, otherwise: (s) => s.required('不能为空') })`,
    props: { placeholder: "如 /system", clearable: true },
  },
  {
    field: "component",
    label: "组件路径",
    as: "input",
    // 仅菜单(C)需要组件路径（后端要求 C 必填）
    visible: (values) => values.type === "C",
    rule: `Yup.string().when('type', { is: 'C', then: (s) => s.required('不能为空'), otherwise: (s) => s })`,
    props: { placeholder: "如 system/users/index", clearable: true },
  },
  {
    field: "permission",
    label: "权限标识",
    as: "input",
    // 目录不需要权限标识；按钮必须填写（后端要求 F 必填）
    visible: (values) => values.type !== "M",
    rule: `Yup.string().when('type', { is: 'F', then: (s) => s.required('不能为空'), otherwise: (s) => s })`,
    props: { placeholder: "如 system:user:list", clearable: true },
  },
  { field: "sort", label: "排序", as: "input-number", props: { min: 0 } },
  { field: "status", label: "状态", as: "switch" },
];

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  const values = (formRef.value?.getForm?.() ?? form.value) as typeof form.value;
  const body: CreateMenuBody = {
    parentId: values.parentId === ROOT_PARENT ? 0 : values.parentId,
    name: values.name,
    title: values.title,
    type: values.type,
    path: values.path || undefined,
    component: values.component || undefined,
    permission: values.permission || undefined,
    icon: icon.value || undefined,
    sort: values.sort,
    status: values.status ? "active" : "disabled",
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

// ---------- 按钮权限（type=F 子项管理） ----------
const btnAuthVisible = ref(false);
const btnAuthMenu = ref<Menu | null>(null);
const btnAuthList = computed<Menu[]>(() =>
  btnAuthMenu.value?.children?.filter((child) => child.type === "F") ?? [],
);

const btnAuthColumns: LewTableColumn[] = [
  { title: "名称", field: "title", width: 160 },
  { title: "权限标识", field: "permission", width: 220 },
  { title: "排序", field: "sort", width: 70 },
  {
    title: "状态",
    field: "status",
    width: 80,
    customRender: ({ row }) => renderStatus((row as { status: string }).status),
  },
  { title: "操作", field: "operation", width: 100, fixed: "right" },
];

function openBtnAuth(row: Menu) {
  btnAuthMenu.value = row;
  btnAuthVisible.value = true;
}

/** 在按钮权限弹窗中为当前菜单新增按钮（type=F） */
function createBtnFromAuth() {
  if (!btnAuthMenu.value) return;
  openCreate(btnAuthMenu.value.id, "F");
}

/** 弹窗内操作后刷新列表时，同步按钮权限弹窗绑定的菜单节点（避免展示过期数据） */
function syncBtnAuthMenu() {
  if (!btnAuthMenu.value) return;
  btnAuthMenu.value = findMenuById(menus.value, btnAuthMenu.value.id) ?? null;
  if (!btnAuthMenu.value) btnAuthVisible.value = false;
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
              v-if="menuOf(row).type !== 'F'"
              v-permission="'system:menu:create'"
              type="text"
              size="small"
              title="添加子菜单"
              @click="openCreate(menuOf(row).id)"
            >
              <Plus :size="14" />
            </LewButton>
            <LewButton
              v-if="menuOf(row).type !== 'F'"
              v-permission="'system:menu:create'"
              type="text"
              size="small"
              title="按钮权限"
              @click="openBtnAuth(menuOf(row))"
            >
              <KeyRound :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:menu:update'"
              type="text"
              size="small"
              title="编辑"
              @click="openEdit(menuOf(row))"
            >
              <Pencil :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:menu:delete'"
              type="text"
              size="small"
              color="error"
              :disabled="(menuOf(row).children?.length ?? 0) > 0"
              title="存在子菜单时不可删除"
              @click="handleDelete(menuOf(row))"
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
      :title="modalTitle"
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
          :options="formOptions"
          @change="onFormChange"
        />

        <!-- 图标选择器（LewForm 选项不支持自定义控件，独立渲染并同步到提交数据） -->
        <div class="mt-4">
          <div class="flex items-center gap-2 mb-2">
            <label
              class="w-80px text-right pr-2 shrink-0 text-13px text-[var(--app-text-secondary)]"
            >
              图标
            </label>
            <div class="flex items-center gap-1.5">
              <component :is="resolveMenuIcon(icon)" :size="17" />
              <span class="text-12.5px text-[var(--app-text-muted)]">
                {{ icon || '未设置（显示默认图标）' }}
              </span>
            </div>
          </div>
          <div class="flex items-start gap-2">
            <div class="w-80px shrink-0"></div>
            <div class="flex-1 flex flex-wrap gap-1">
              <button
                v-for="opt in MENU_ICON_OPTIONS"
                :key="opt.key"
                type="button"
                class="icon-btn !w-30px !h-30px"
                :class="{
                  '!bg-[var(--lew-color-primary-light)] !text-[var(--lew-color-primary)]':
                    icon === opt.key,
                }"
                :title="opt.key"
                @click="icon = icon === opt.key ? '' : opt.key"
              >
                <component :is="opt.component" :size="16" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </LewModal>

    <!-- 按钮权限弹窗 -->
    <LewModal
      v-model:visible="btnAuthVisible"
      :title="`按钮权限 - ${btnAuthMenu?.title ?? ''}`"
      width="680px"
      :hide-footer="true"
    >
      <div class="p-5">
        <div class="flex items-center justify-between mb-3">
          <p class="m-0 text-13px text-[var(--app-text-muted)]">
            为「{{ btnAuthMenu?.title }}」配置其下的按钮权限（type=F）
          </p>
          <LewButton
            v-permission="'system:menu:create'"
            type="light"
            size="small"
            @click="createBtnFromAuth"
          >
            <Plus :size="14" style="margin-right: 2px" /> 新增按钮
          </LewButton>
        </div>
        <LewTable
          :data-source="btnAuthList"
          :columns="btnAuthColumns"
          :focusable="false"
          size="small"
        >
          <template #operation="{ row }">
            <div class="flex items-center gap-1">
              <LewButton
                v-permission="'system:menu:update'"
                type="text"
                size="small"
                @click="openEdit(row as unknown as Menu)"
              >
                <Pencil :size="13" />
              </LewButton>
              <LewButton
                v-permission="'system:menu:delete'"
                type="text"
                size="small"
                color="error"
                @click="handleDelete(row as unknown as Menu)"
              >
                <Trash2 :size="13" />
              </LewButton>
            </div>
          </template>
        </LewTable>
      </div>
    </LewModal>
  </div>
</template>