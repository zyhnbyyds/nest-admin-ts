<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { ChevronsLeft, ChevronsRight } from "lucide-vue-next";
import { usePermissionStore } from "~/store/permission";
import { useSettingsStore } from "~/store/settings";
import type { SidebarItem } from "~/types/app";
import SidebarMenu from "./components/SidebarMenu.vue";
import AppHeader from "./components/AppHeader.vue";
import TabsBar from "./components/TabsBar.vue";
import ThemePanel from "./components/ThemePanel.vue";
import AiChatPanel from "./components/AiChatPanel.vue";

const route = useRoute();
const settings = useSettingsStore();
const permissionStore = usePermissionStore();
const themeVisible = ref(false);
const aiVisible = ref(false);

const sidebarWidth = computed(() =>
  settings.collapsed ? "var(--app-sidebar-collapsed-width)" : "var(--app-sidebar-width)",
);

/** 侧边栏菜单：AI 整页入口改由悬浮球承载，故从菜单中移除 /ai */
const sidebarItems = computed<SidebarItem[]>(() => {
  const dropAi = (list: SidebarItem[]): SidebarItem[] =>
    list
      .filter((item) => item.path !== "/ai")
      .map((item) => (item.children ? { ...item, children: dropAi(item.children) } : item));
  return dropAi(permissionStore.sidebar);
});

/** 页面过渡：JS 驱动淡入（不依赖 transitionend，避免路由切换卡死） */
const pageTransition = {
  enterActiveClass: "",
  enterFromClass: "",
  enterToClass: "",
  leaveActiveClass: "",
  leaveFromClass: "",
  leaveToClass: "",
  enter(el: Element, done: () => void) {
    const node = el as HTMLElement;
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    requestAnimationFrame(() => {
      node.style.transition = "opacity 0.2s ease, transform 0.2s ease";
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
      setTimeout(done, 220);
    });
  },
  leave(el: Element, done: () => void) {
    const node = el as HTMLElement;
    node.style.transition = "opacity 0.15s ease, transform 0.15s ease";
    node.style.opacity = "0";
    node.style.transform = "translateY(-4px)";
    setTimeout(done, 170);
  },
};
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <!-- 侧边栏 -->
    <aside
      class="flex flex-col shrink-0 h-full bg-[var(--app-bg-card)] border-r border-[var(--app-border)] transition-[width] duration-200"
      :style="{ width: sidebarWidth }"
    >
      <div
        class="flex items-center justify-center gap-2 h-14 shrink-0 px-3 overflow-hidden border-b border-[var(--app-border)]"
      >
        <img
          src="/image/logo.png"
          alt="Nest Admin Logo"
          class="w-30px h-30px shrink-0 object-contain"
        />
        <span
          v-if="!settings.collapsed"
          class="text-17px font-800 tracking--2% whitespace-nowrap text-[var(--lew-color-primary)]"
        >
          Nest Admin
        </span>
      </div>
      <SidebarMenu :items="sidebarItems" :collapsed="settings.collapsed" />
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
      <AppHeader @open-theme="themeVisible = true" @open-ai="aiVisible = true" />
      <TabsBar />
      <main class="flex-1 overflow-y-auto p-5">
        <RouterView v-slot="{ Component }">
          <Transition
            :css="false"
            mode="out-in"
            @enter="pageTransition.enter"
            @leave="pageTransition.leave"
          >
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </main>
    </div>

    <ThemePanel v-model:visible="themeVisible" />

    <!-- AI 操作助手弹出面板（Header 图标触发） -->
    <AiChatPanel v-model:visible="aiVisible" />
  </div>
</template>
