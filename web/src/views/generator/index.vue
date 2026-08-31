<script setup lang="ts">
import { ref } from "vue";
import { Eye, Wand2 } from "lucide-vue-next";
import { LewButton, LewMessage, LewModal, LewSelect, LewTable } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { generateCode, getTableColumns, listTables, previewCode } from "~/api/generator";
import type { GeneratedFile, TableInfo } from "~/api/generator";
import type { ColumnMeta } from "~/types/api";

// ---------- 表列表 ----------
const tables = ref<TableInfo[]>([]);
const loading = ref(false);
const selectedTable = ref<string>("");

const columns: LewTableColumn[] = [
  { title: "表名", field: "tableName", width: 220 },
  { title: "注释", field: "comment" },
  { title: "创建时间", field: "createdAt", width: 180 },
  { title: "操作", field: "operation", width: 100, fixed: "right" },
];

async function fetchTables() {
  loading.value = true;
  try {
    tables.value = await listTables();
  } finally {
    loading.value = false;
  }
}

void fetchTables();

// ---------- 字段预览 ----------
const columnsVisible = ref(false);
const tableColumns = ref<ColumnMeta[]>([]);
const columnsLoading = ref(false);

async function openColumns(table: TableInfo) {
  columnsVisible.value = true;
  columnsLoading.value = true;
  try {
    tableColumns.value = await getTableColumns(table.tableName);
  } finally {
    columnsLoading.value = false;
  }
}

// ---------- 代码预览 ----------
const previewVisible = ref(false);
const previewFiles = ref<GeneratedFile[]>([]);
const activeFile = ref<GeneratedFile | null>(null);
const previewLoading = ref(false);

async function openPreview() {
  if (!selectedTable.value) {
    LewMessage.warning("请先选择表");
    return;
  }
  previewVisible.value = true;
  previewLoading.value = true;
  try {
    const result = await previewCode(selectedTable.value);
    previewFiles.value = result.files;
    activeFile.value = result.files[0] ?? null;
  } finally {
    previewLoading.value = false;
  }
}

// ---------- 生成代码 ----------
const directory = ref("src/modules/generated");
const generating = ref(false);

async function handleGenerate() {
  if (!selectedTable.value) {
    LewMessage.warning("请先选择表");
    return;
  }
  generating.value = true;
  try {
    await generateCode(selectedTable.value, directory.value);
    LewMessage.success(`代码已生成到 ${directory.value}`);
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <div class="page-container">
    <!-- 页头 -->
    <div>
      <h2 class="page-title m-0">代码生成器</h2>
      <p class="page-subtitle mt-1 mb-0">根据数据库表生成 CRUD 代码（低优先级功能）</p>
    </div>

    <!-- 工具栏 -->
    <div class="app-card flex items-center gap-3 p-4">
      <LewSelect
        v-model="selectedTable"
        width="240px"
        placeholder="选择数据表"
        :options="
          tables.map((t) => ({
            label: `${t.tableName}（${t.comment || '无注释'}）`,
            value: t.tableName,
          }))
        "
      />
      <LewButton type="light" :loading="loading" @click="fetchTables">刷新</LewButton>
      <LewButton v-permission="'system:generator:list'" type="light" @click="openPreview">
        <Eye :size="15" style="margin-right: 4px" /> 预览代码
      </LewButton>
      <LewButton
        v-permission="'system:generator:generate'"
        type="fill"
        :loading="generating"
        @click="handleGenerate"
      >
        <Wand2 :size="15" style="margin-right: 4px" /> 生成代码
      </LewButton>
    </div>

    <!-- 表列表 -->
    <div class="app-card overflow-hidden">
      <LewTable
        :columns="columns"
        :data-source="tables"
        :loading="loading"
        :focusable="false"
        size="small"
      >
        <template #operation="{ row }">
          <LewButton type="text" size="small" @click="openColumns(row as unknown as TableInfo)">
            查看字段
          </LewButton>
        </template>
      </LewTable>
    </div>

    <!-- 字段弹窗 -->
    <LewModal v-model:visible="columnsVisible" title="表字段信息" width="720px" :hide-footer="true">
      <div class="p-5">
        <LewTable
          :data-source="tableColumns"
          :loading="columnsLoading"
          :focusable="false"
          size="small"
          :columns="[
            { title: '字段名', field: 'name', width: 160 },
            { title: '类型', field: 'columnType', width: 140 },
            { title: '可空', field: 'nullable', width: 80 },
            { title: '键', field: 'columnKey', width: 80 },
            { title: '默认值', field: 'defaultValue', width: 120 },
            { title: '注释', field: 'comment' },
          ]"
        />
      </div>
    </LewModal>

    <!-- 代码预览弹窗 -->
    <LewModal v-model:visible="previewVisible" title="代码预览" width="860px" :hide-footer="true">
      <div class="p-5">
        <div class="flex gap-3" style="height: 480px">
          <!-- 文件列表 -->
          <div
            class="w-220px shrink-0 overflow-y-auto border border-[var(--app-border)] rounded-8px"
          >
            <button
              v-for="file in previewFiles"
              :key="file.path"
              class="block w-full px-3 py-2 text-left text-12.5px border-none bg-transparent cursor-pointer transition-colors duration-150 hover:bg-[var(--app-bg-hover)]"
              :class="
                activeFile?.path === file.path
                  ? 'bg-[var(--lew-color-primary-light)] text-[var(--lew-color-primary)] font-600'
                  : 'text-[var(--app-text-secondary)]'
              "
              @click="activeFile = file"
            >
              {{ file.path }}
            </button>
          </div>
          <!-- 代码内容 -->
          <pre
            class="flex-1 m-0 p-3 overflow-auto bg-[var(--lew-bgcolor-1)] border border-[var(--app-border)] rounded-8px text-12px leading-relaxed"
          ><code>{{ activeFile?.content ?? '选择左侧文件查看' }}</code></pre>
        </div>
      </div>
    </LewModal>
  </div>
</template>
