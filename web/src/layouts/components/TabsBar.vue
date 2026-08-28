<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";
import { X } from "lucide-vue-next";
import type { TabItem } from "~/types/app";

const route = useRoute();
const tabs = ref<TabItem[]>([]);

function addTab() {
  if (route.path === "/login") return;
  const exists = tabs.value.find((tab) => tab.path === route.path);
  if (exists) return;
  tabs.value.push({
    name: (route.name as string) ?? "",
    path: route.path,
    title: (route.meta.title as string) ?? route.path,
    closable: !["/dashboard", "/profile"].includes(route.path),
  });
}

watch(() => route.path, addTab, { immediate: true });

function closeTab(tab: TabItem) {
  const index = tabs.value.findIndex((item) => item.path === tab.path);
  if (index === -1) return;
  tabs.value.splice(index, 1);
  // 关闭当前 tab → 跳相邻 tab
  if (tab.path === route.path) {
    const next = tabs.value[index] ?? tabs.value[index - 1];
    if (next) {
      // navigate 由模板 RouterLink 处理不了，这里手动跳
      window.history.pushState({}, "", next.path);
      location.assign(next.path);
    }
  }
}
</script>

<template>
  <div
    class="flex items-center gap-1.5 h-38px px-3 shrink-0 overflow-x-auto bg-[var(--app-bg-card)] border-b border-[var(--app-border)]"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="flex items-center gap-1 px-2.5 py-1 rounded-6px text-12.5px text-[var(--app-text-secondary)] no-underline whitespace-nowrap transition-colors duration-200 hover:bg-[var(--app-bg-hover)]"
      active-class="!bg-[var(--lew-color-primary-light)] !text-[var(--lew-color-primary)] font-600"
    >
      <span>{{ tab.title }}</span>
      <X
        v-if="tab.closable"
        :size="13"
        class="opacity-60 cursor-pointer transition-opacity duration-200 hover:opacity-100"
        @click.stop.prevent="closeTab(tab)"
      />
    </RouterLink>
  </div>
</template>
