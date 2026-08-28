<script setup lang="ts">
import { onMounted, ref } from "vue";
import { LogOut } from "lucide-vue-next";
import { LewButton, LewDialog, LewMessage, LewTable } from "lew-ui";
import type { LewTableColumn } from "lew-ui";
import { forceLogout, listOnlineUsers } from "~/api/monitor";
import { formatDateTime } from "~/composables/useFormat";
import type { OnlineSession } from "~/types/api";

const sessions = ref<OnlineSession[]>([]);
const loading = ref(false);

const columns: LewTableColumn[] = [
  { title: "用户ID", field: "userId", width: 100 },
  { title: "用户名", field: "username", width: 160 },
  { title: "登录IP", field: "ip", width: 160 },
  { title: "User-Agent", field: "userAgent" },
  {
    title: "登录时间",
    field: "loginAt",
    width: 180,
    customRender: ({ row }) => formatDateTime((row as unknown as OnlineSession).loginAt),
  },
  { title: "操作", field: "operation", width: 90, fixed: "right" },
];

async function fetchList() {
  loading.value = true;
  try {
    sessions.value = await listOnlineUsers();
  } finally {
    loading.value = false;
  }
}

void onMounted(fetchList);

function handleForceLogout(row: OnlineSession) {
  LewDialog.warning({
    title: "强制下线",
    content: `确定将用户「${row.username}」强制下线吗？`,
    onOk: async () => {
      await forceLogout(row.userId);
      LewMessage.success("已强制下线");
      void fetchList();
    },
  });
}
</script>

<template>
  <div class="page-container">
    <!-- 页头 -->
    <div>
      <h2 class="page-title m-0">在线用户</h2>
      <p class="page-subtitle mt-1 mb-0">查看当前在线用户，支持强制下线</p>
    </div>

    <!-- 表格 -->
    <div class="app-card overflow-hidden">
      <LewTable :columns="columns" :data-source="sessions" :loading="loading" size="small">
        <template #operation="{ row }">
          <LewButton
            v-permission="'monitor:online:delete'"
            type="text"
            size="small"
            color="error"
            @click="handleForceLogout(row as unknown as OnlineSession)"
          >
            <LogOut :size="14" style="margin-right: 2px" /> 下线
          </LewButton>
        </template>
      </LewTable>
    </div>
  </div>
</template>
