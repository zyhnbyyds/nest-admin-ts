<script setup lang="ts">
import { ref } from "vue";
import { Download, Trash2, Upload } from "lucide-vue-next";
import { LewButton, LewDialog, LewMessage, LewPagination, LewTable } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { deleteFile, fileDownloadUrl, uploadFile } from "~/api/files";
import { useTable } from "~/composables/useTable";
import { formatDateTime, formatSize } from "~/composables/useFormat";
import type { FileItem } from "~/types/api";

// ---------- 列表 ----------
const { items, loading, currentPage, pageSize, total, refresh, handleChange } = useTable<FileItem>({
  url: "/files",
});

const columns: LewTableColumn[] = [
  { title: "ID", field: "id", width: 70 },
  { title: "文件名", field: "originalName", width: 240 },
  { title: "类型", field: "mime", width: 140 },
  {
    title: "大小",
    field: "size",
    width: 110,
    customRender: ({ row }) => formatSize((row as unknown as FileItem).size),
  },
  {
    title: "上传时间",
    field: "createdAt",
    width: 170,
    customRender: ({ row }) => formatDateTime((row as unknown as FileItem).createdAt),
  },
  { title: "操作", field: "operation", width: 90, fixed: "right" },
];

void refresh();

// ---------- 上传 ----------
const uploading = ref(false);
const fileInput = ref<HTMLInputElement>();

function triggerUpload() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploading.value = true;
  try {
    await uploadFile(file);
    LewMessage.success("上传成功");
    void refresh();
  } finally {
    uploading.value = false;
    input.value = "";
  }
}

// ---------- 下载 ----------
function handleDownload(row: FileItem) {
  window.open(fileDownloadUrl(row.id), "_blank");
}

// ---------- 删除 ----------
function handleDelete(row: FileItem) {
  LewDialog.warning({
    title: "删除确认",
    content: `确定删除文件「${row.originalName}」吗？`,
    onOk: async () => {
      await deleteFile(row.id);
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
        <h2 class="page-title m-0">文件管理</h2>
        <p class="page-subtitle mt-1 mb-0">上传与管理文件（单文件最大 10MB）</p>
      </div>
      <LewButton
        v-permission="'system:file:upload'"
        type="fill"
        :loading="uploading"
        @click="triggerUpload"
      >
        <Upload :size="15" style="margin-right: 4px" /> 上传文件
      </LewButton>
      <input ref="fileInput" type="file" class="hidden" @change="handleFileChange" />
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
              v-permission="'system:file:list'"
              type="text"
              size="small"
              title="下载"
              @click="handleDownload(row as unknown as FileItem)"
            >
              <Download :size="14" />
            </LewButton>
            <LewButton
              v-permission="'system:file:delete'"
              type="text"
              size="small"
              color="error"
              @click="handleDelete(row as unknown as FileItem)"
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
  </div>
</template>
