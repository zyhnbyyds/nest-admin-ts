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
import {
  createDictData,
  createDictType,
  deleteDictData,
  deleteDictType,
  updateDictData,
  updateDictType,
} from "~/api/system/dict";
import { clearDictCache } from "~/composables/useDict";
import { useTable } from "~/composables/useTable";
import type { DictData, DictType } from "~/types/api";
import { renderStatus } from "~/utils/render";

// ---------- 左侧：字典类型 ----------
const typeTable = useTable<DictType>({ url: "/system/dict-types", defaultPageSize: 20 });
void typeTable.search();

const typeColumns: LewTableColumn[] = [
  { title: "字典名称", field: "name", width: 150 },
  { title: "类型标识", field: "type", width: 160 },
  {
    title: "状态",
    field: "status",
    width: 80,
    customRender: ({ row }) => renderStatus((row as { status: string }).status),
  },
  { title: "操作", field: "operation", width: 80, fixed: "right" },
];

const selectedType = ref<DictType | null>(null);

function selectType(row: DictType) {
  selectedType.value = row;
  void dataSearch();
}

// ---------- 右侧：字典数据 ----------
const dataQuery = ref<{ type?: string }>({});
const dataTable = useTable<DictData>({
  url: "/system/dict-data",
  query: () => ({ ...dataQuery.value, type: selectedType.value?.type }),
});
const {
  items: dataItems,
  loading: dataLoading,
  currentPage,
  pageSize,
  total,
  search: dataSearch,
  refresh: dataRefresh,
  handleChange,
} = dataTable;

const dataColumns: LewTableColumn[] = [
  { title: "标签", field: "label", width: 140 },
  { title: "键值", field: "value", width: 120 },
  { title: "排序", field: "sort", width: 70 },
  {
    title: "状态",
    field: "status",
    width: 80,
    customRender: ({ row }) => renderStatus((row as { status: string }).status),
  },
  { title: "样式类名", field: "cssClass", width: 120 },
  { title: "列表样式", field: "listClass", width: 120 },
  { title: "操作", field: "operation", width: 80, fixed: "right" },
];

// ---------- 字典类型弹窗 ----------
const typeModalVisible = ref(false);
const typeEditingId = ref<number | null>(null);
const typeFormRef = ref();
const typeForm = ref({ name: "", type: "", status: "active", remark: "" });

function openTypeCreate() {
  typeEditingId.value = null;
  typeForm.value = { name: "", type: "", status: "active", remark: "" };
  typeModalVisible.value = true;
}

function openTypeEdit(row: DictType) {
  typeEditingId.value = row.id;
  typeForm.value = { name: row.name, type: row.type, status: row.status, remark: row.remark ?? "" };
  typeModalVisible.value = true;
}

async function handleTypeSubmit() {
  const valid = await typeFormRef.value?.validate();
  if (!valid) return;
  const body = {
    name: typeForm.value.name,
    type: typeForm.value.type,
    status: typeForm.value.status as "active" | "disabled",
    remark: typeForm.value.remark || undefined,
  };
  if (typeEditingId.value === null) {
    await createDictType(body);
    LewMessage.success("创建成功");
  } else {
    await updateDictType(typeEditingId.value, body);
    LewMessage.success("更新成功");
  }
  typeModalVisible.value = false;
  clearDictCache();
  void typeTable.refresh();
}

function handleTypeDelete(row: DictType) {
  LewDialog.warning({
    title: "删除确认",
    content: `确定删除字典类型「${row.name}」吗？其下所有字典数据将无法使用。`,
    onOk: async () => {
      await deleteDictType(row.id);
      LewMessage.success("删除成功");
      clearDictCache();
      if (selectedType.value?.id === row.id) selectedType.value = null;
      void typeTable.refresh();
    },
  });
}

// ---------- 字典数据弹窗 ----------
const dataModalVisible = ref(false);
const dataEditingId = ref<number | null>(null);
const dataFormRef = ref();
const dataForm = ref({
  label: "",
  value: "",
  sort: 0,
  status: "active",
  cssClass: "",
  listClass: "",
});

const statusOptions = [
  { label: "启用", value: "active" },
  { label: "禁用", value: "disabled" },
];

function openDataCreate() {
  dataEditingId.value = null;
  dataForm.value = { label: "", value: "", sort: 0, status: "active", cssClass: "", listClass: "" };
  dataModalVisible.value = true;
}

function openDataEdit(row: DictData) {
  dataEditingId.value = row.id;
  dataForm.value = {
    label: row.label,
    value: row.value,
    sort: row.sort,
    status: row.status,
    cssClass: row.cssClass ?? "",
    listClass: row.listClass ?? "",
  };
  dataModalVisible.value = true;
}

async function handleDataSubmit() {
  const valid = await dataFormRef.value?.validate();
  if (!valid) return;
  if (!selectedType.value) {
    LewMessage.warning("请先选择左侧字典类型");
    return;
  }
  const body = {
    type: selectedType.value.type,
    label: dataForm.value.label,
    value: dataForm.value.value,
    sort: dataForm.value.sort,
    status: dataForm.value.status as "active" | "disabled",
    cssClass: dataForm.value.cssClass || undefined,
    listClass: dataForm.value.listClass || undefined,
  };
  if (dataEditingId.value === null) {
    await createDictData(body);
    LewMessage.success("创建成功");
  } else {
    await updateDictData(dataEditingId.value, body);
    LewMessage.success("更新成功");
  }
  dataModalVisible.value = false;
  clearDictCache(selectedType.value.type);
  void dataRefresh();
}

function handleDataDelete(row: DictData) {
  LewDialog.warning({
    title: "删除确认",
    content: `确定删除字典数据「${row.label}」吗？`,
    onOk: async () => {
      await deleteDictData(row.id);
      LewMessage.success("删除成功");
      clearDictCache(row.type);
      void dataRefresh();
    },
  });
}
</script>

<template>
  <div class="page-container">
    <!-- 页头 -->
    <div>
      <h2 class="page-title m-0">字典管理</h2>
      <p class="page-subtitle mt-1 mb-0">维护系统字典类型与字典数据</p>
    </div>

    <div class="grid grid-cols-5 gap-4">
      <!-- 左：字典类型 -->
      <div class="app-card col-span-2 overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-4 pb-2">
          <h3 class="m-0 text-15px font-600">字典类型</h3>
          <LewButton
            v-permission="'system:dict:create'"
            type="fill"
            size="small"
            @click="openTypeCreate"
          >
            <Plus :size="14" style="margin-right: 2px" /> 新增
          </LewButton>
        </div>
        <LewTable
          :columns="typeColumns"
          :data-source="typeTable.items.value"
          :loading="typeTable.loading.value"
          size="small"
          @row-click="selectType"
        >
          <template #operation="{ row }">
            <div class="flex items-center gap-1">
              <LewButton
                type="text"
                size="small"
                @click.stop="openTypeEdit(row as unknown as DictType)"
              >
                <Pencil :size="13" />
              </LewButton>
              <LewButton
                type="text"
                size="small"
                color="error"
                @click.stop="handleTypeDelete(row as unknown as DictType)"
              >
                <Trash2 :size="13" />
              </LewButton>
            </div>
          </template>
        </LewTable>
        <div class="flex justify-end p-3">
          <LewPagination
            v-model:current-page="typeTable.currentPage.value"
            v-model:page-size="typeTable.pageSize.value"
            :total="typeTable.total.value"
            size="small"
            @change="typeTable.handleChange"
          />
        </div>
      </div>

      <!-- 右：字典数据 -->
      <div class="app-card col-span-3 overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-4 pb-2">
          <h3 class="m-0 text-15px font-600">
            字典数据
            <LewTag v-if="selectedType" size="small" style="margin-left: 8px">
              {{ selectedType.name }}
            </LewTag>
          </h3>
          <LewButton
            v-permission="'system:dict:create'"
            type="fill"
            size="small"
            :disabled="!selectedType"
            @click="openDataCreate"
          >
            <Plus :size="14" style="margin-right: 2px" /> 新增
          </LewButton>
        </div>
        <LewTable
          :columns="dataColumns"
          :data-source="dataItems"
          :loading="dataLoading"
          size="small"
        >
          <template #operation="{ row }">
            <div class="flex items-center gap-1">
              <LewButton type="text" size="small" @click="openDataEdit(row as unknown as DictData)">
                <Pencil :size="13" />
              </LewButton>
              <LewButton
                type="text"
                size="small"
                color="error"
                @click="handleDataDelete(row as unknown as DictData)"
              >
                <Trash2 :size="13" />
              </LewButton>
            </div>
          </template>
        </LewTable>
        <div class="flex justify-end p-3">
          <LewPagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            size="small"
            @change="handleChange"
          />
        </div>
      </div>
    </div>

    <!-- 字典类型弹窗 -->
    <LewModal
      v-model:visible="typeModalVisible"
      :title="typeEditingId === null ? '新增字典类型' : '编辑字典类型'"
      width="440px"
    >
      <LewForm
        ref="typeFormRef"
        v-model="typeForm"
        label-width="72px"
        :options="[
          {
            field: 'name',
            label: '字典名称',
            as: 'input',
            rule: 'Yup.string().required()',
            props: { placeholder: '如 用户性别', clearable: true },
          },
          {
            field: 'type',
            label: '类型标识',
            as: 'input',
            rule: 'Yup.string().required()',
            props: { placeholder: '小写字母/数字/:-_', clearable: true },
          },
          { field: 'status', label: '状态', as: 'select', props: { options: statusOptions } },
          {
            field: 'remark',
            label: '备注',
            as: 'textarea',
            props: { placeholder: '选填', rows: 2 },
          },
        ]"
      />
      <template #footer>
        <LewButton type="light" @click="typeModalVisible = false">取消</LewButton>
        <LewButton type="fill" @click="handleTypeSubmit">保存</LewButton>
      </template>
    </LewModal>

    <!-- 字典数据弹窗 -->
    <LewModal
      v-model:visible="dataModalVisible"
      :title="dataEditingId === null ? '新增字典数据' : '编辑字典数据'"
      width="440px"
    >
      <LewForm
        ref="dataFormRef"
        v-model="dataForm"
        label-width="72px"
        :options="[
          {
            field: 'label',
            label: '标签',
            as: 'input',
            rule: 'Yup.string().required()',
            props: { placeholder: '如 男', clearable: true },
          },
          {
            field: 'value',
            label: '键值',
            as: 'input',
            rule: 'Yup.string().required()',
            props: { placeholder: '如 1', clearable: true },
          },
          { field: 'sort', label: '排序', as: 'input-number', props: { min: 0 } },
          { field: 'status', label: '状态', as: 'select', props: { options: statusOptions } },
          {
            field: 'cssClass',
            label: '样式类名',
            as: 'input',
            props: { placeholder: '选填', clearable: true },
          },
          {
            field: 'listClass',
            label: '列表样式',
            as: 'input',
            props: { placeholder: '选填', clearable: true },
          },
        ]"
      />
      <template #footer>
        <LewButton type="light" @click="dataModalVisible = false">取消</LewButton>
        <LewButton type="fill" @click="handleDataSubmit">保存</LewButton>
      </template>
    </LewModal>
  </div>
</template>
