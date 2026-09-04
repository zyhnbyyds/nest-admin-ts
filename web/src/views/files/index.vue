<script setup lang="ts">
import { ref } from "vue";
import { Download, Eye, Trash2, Upload } from "lucide-vue-next";
import { LewButton, LewMessage, LewModal, LewPagination, LewTable } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { deleteFile, fileDownloadUrl, filePreviewUrl, uploadFile } from "~/api/files";
import { useTable } from "~/composables/useTable";
import { formatDateTime, formatSize } from "~/composables/useFormat";
import type { FileItem } from "~/types/api";
import { confirmDanger } from "~/utils/confirm";
import IconButton from "~/components/IconButton.vue";

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
  { title: "操作", field: "operation", width: 120, fixed: "right" },
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

// ---------- 图片预览 ----------
const previewVisible = ref(false);
const previewFile = ref<FileItem | null>(null);
const previewLoading = ref(true);

function isImage(item: FileItem) {
  return item.mime?.toLowerCase().startsWith("image/");
}

function handlePreview(row: FileItem) {
  if (!isImage(row)) return;
  previewFile.value = row;
  previewLoading.value = true;
  previewVisible.value = true;
}

// ---------- 删除 ----------
function handleDelete(row: FileItem) {
  confirmDanger({
    title: "删除确认",
    content: `确定删除文件「${row.originalName}」吗？`,
    onConfirm: async () => {
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
            <IconButton
              v-if="isImage(row as unknown as FileItem)"
              permission="system:file:list"
              title="预览"
              @click="handlePreview(row as unknown as FileItem)"
            >
              <Eye :size="14" />
            </IconButton>
            <IconButton
              permission="system:file:list"
              title="下载"
              @click="handleDownload(row as unknown as FileItem)"
            >
              <Download :size="14" />
            </IconButton>
            <IconButton
              permission="system:file:delete"
              color="error"
              title="删除"
              @click="handleDelete(row as unknown as FileItem)"
            >
              <Trash2 :size="14" />
            </IconButton>
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

    <!-- 图片预览弹窗 -->
    <LewModal
      v-model:visible="previewVisible"
      :title="previewFile?.originalName ?? '预览'"
      width="720px"
      :hide-footer="true"
    >
      <div class="p-5">
        <div
          v-if="previewLoading"
          class="flex items-center justify-center h-400px text-13px text-[var(--app-text-muted)]"
        >
          加载中…
        </div>
        <img
          v-show="!previewLoading && previewFile"
          :key="previewFile?.id"
          :src="previewFile ? filePreviewUrl(previewFile.id) : ''"
          class="block max-w-full max-h-70vh mx-auto object-contain rounded-8px"
          alt="预览"
          @load="previewLoading = false"
          @error="previewLoading = false"
        />
        <div
          v-if="!previewLoading && !previewFile"
          class="flex items-center justify-center h-200px text-13px text-[var(--app-text-muted)]"
        >
          无可预览文件
        </div>
      </div>
    </LewModal>
  </div>
</template>
