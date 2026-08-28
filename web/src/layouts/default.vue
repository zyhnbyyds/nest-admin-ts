<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { ChevronsLeft, ChevronsRight } from "lucide-vue-next";
import { usePermissionStore } from "~/store/permission";
import { useSettingsStore } from "~/store/settings";
import SidebarMenu from "./components/SidebarMenu.vue";
import AppHeader from "./components/AppHeader.vue";
import TabsBar from "./components/TabsBar.vue";
import ThemePanel from "./components/ThemePanel.vue";
import { ref } from "vue";

const route = useRoute();
const settings = useSettingsStore();
const permissionStore = usePermissionStore();
const themeVisible = ref(false);

const sidebarWidth = computed(() =>
  settings.collapsed ? "var(--app-sidebar-collapsed-width)" : "var(--app-sidebar-width)",
);
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <!-- 侧边栏 -->
    <aside
      class="flex flex-col shrink-0 h-full bg-[var(--app-bg-card)] border-r border-[var(--app-border)] transition-[width] duration-200"
      :style="{ width: sidebarWidth }"
    >
      <div
        class="flex items-center justify-center h-14 shrink-0 border-b border-[var(--app-border)]"
      >
        <span class="text-17px font-800 tracking--2% text-[var(--lew-color-primary)]">
          {{ settings.collapsed ? "NA" : "Nest Admin" }}
        </span>
      </div>
      <SidebarMenu :items="permissionStore.sidebar" :collapsed="settings.collapsed" />
      <div
        class="flex items-center justify-center h-36px shrink-0 cursor-pointer text-[var(--app-text-muted)] border-t border-[var(--app-border)] transition-colors duration-200 hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)]"
        @click="settings.toggleCollapsed()"
      >
        <ChevronsLeft v-if="!settings.collapsed" :size="16" />
        <ChevronsRight v-else :size="16" />
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <AppHeader @open-theme="themeVisible = true" />
      <TabsBar />
      <main class="flex-1 overflow-y-auto p-5">
        <RouterView v-slot="{ Component }">
          <Transition name="fade-slide" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <ThemePanel v-model:visible="themeVisible" />
  </div>
</template>
