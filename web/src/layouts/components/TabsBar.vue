<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEventListener } from "@vueuse/core";
import { CircleX, ListX, X } from "lucide-vue-next";
import type { TabItem } from "~/types/app";

const route = useRoute();
const router = useRouter();
const tabs = ref<TabItem[]>([]);

function addTab() {
  if (route.path === "/login") return;
  const exists = tabs.value.find((tab) => tab.path === route.path);
  if (exists) return;
  tabs.value.push({
    name: (route.name as string) ?? "",
    path: route.path,
    title: (route.meta.title as string) ?? route.path,
    // 仅工作台作为首页固定不可关闭，其余 tab（含个人中心）均可关闭
    closable: route.path !== "/dashboard",
  });
}

watch(() => route.path, addTab, { immediate: true });

// ---------- 关闭逻辑 ----------

function closeTab(tab: TabItem) {
  const index = tabs.value.findIndex((item) => item.path === tab.path);
  if (index === -1) return;
  tabs.value.splice(index, 1);
  // 关闭的是当前 tab → 跳到相邻 tab
  if (tab.path === route.path) {
    const next = tabs.value[index] ?? tabs.value[index - 1];
    if (next) void router.push(next.path);
  }
  closeMenu();
}

/** 若当前路由对应的 tab 已被移除，自动跳到第一个剩余 tab */
async function ensureCurrent() {
  if (tabs.value.some((tab) => tab.path === route.path)) return;
  const target = tabs.value[0];
  if (target) await router.push(target.path);
}

/** 关闭当前（右键目标） */
function closeCurrent() {
  if (menuTab.value) closeTab(menuTab.value);
  else closeMenu();
}

/** 关闭其他：仅保留固定 tab 与右键目标 tab */
function closeOthers() {
  const keepPath = menuTab.value?.path;
  tabs.value = tabs.value.filter((tab) => !tab.closable || tab.path === keepPath);
  void ensureCurrent();
  closeMenu();
}

/** 关闭所有：仅保留固定（不可关闭）tab */
function closeAll() {
  tabs.value = tabs.value.filter((tab) => !tab.closable);
  void ensureCurrent();
  closeMenu();
}

/** 是否存在「非当前右键目标」的其他可关闭 tab（用于禁用 关闭其他） */
const hasOtherClosable = computed(() =>
  tabs.value.some((tab) => tab.closable && tab.path !== menuTab.value?.path),
);

// ---------- 右键菜单 ----------
const menuVisible = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuTab = ref<TabItem | null>(null);
const menuRef = ref<HTMLElement | null>(null);

function openMenu(tab: TabItem, event: MouseEvent) {
  menuTab.value = tab;
  // 先定位于点击点，再在渲染后按视口边界收敛（避免靠近边缘时溢出）
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuVisible.value = true;
  void nextTick(() => {
    const el = menuRef.value;
    if (!el) return;
    menuX.value = Math.min(menuX.value, window.innerWidth - el.offsetWidth - 8);
    menuY.value = Math.min(menuY.value, window.innerHeight - el.offsetHeight - 8);
  });
}

function closeMenu() {
  if (!menuVisible.value) return;
  menuVisible.value = false;
  menuTab.value = null;
}

// 点击外部 / 滚动 / 缩放时关闭右键菜单（useEventListener 自动管理绑定与解绑）
useEventListener(window, "click", closeMenu);
useEventListener(window, "resize", closeMenu);
useEventListener(window, "scroll", closeMenu, { capture: true });

// 路由切换时关闭菜单（避免菜单残留）
watch(() => route.path, closeMenu);
</script>

<template>
  <div
    class="flex items-center gap-1.5 h-38px px-3 shrink-0 overflow-x-auto bg-[var(--app-bg-card)] border-b border-[var(--app-border)]"
    @contextmenu.prevent="closeMenu"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="group flex items-center gap-1 px-2.5 py-1 rounded-6px text-12.5px text-[var(--app-text-secondary)] no-underline whitespace-nowrap transition-colors duration-200 hover:bg-[var(--app-bg-hover)]"
      :class="
        tab.path === route.path
          ? '!bg-[var(--lew-color-primary-light)] !text-[var(--lew-color-primary)] font-600'
          : ''
      "
      @contextmenu.stop.prevent="openMenu(tab, $event)"
    >
      <span class="leading-none">{{ tab.title }}</span>
      <X
        v-if="tab.closable"
        :size="13"
        class="opacity-0 transition-opacity duration-150 group-hover:opacity-70 hover:!opacity-100 hover:!text-[var(--lew-color-danger)]"
        :class="tab.path === route.path ? '!opacity-80' : ''"
        @click.stop.prevent="closeTab(tab)"
      />
    </RouterLink>
  </div>

  <!-- 右键菜单 -->
  <Teleport to="body">
    <div
      v-if="menuVisible"
      ref="menuRef"
      class="fixed z-50 min-w-140px py-1 rounded-8px border border-[var(--app-border)] bg-[var(--app-bg-card)] shadow-[var(--app-shadow-hover)]"
      :style="{ left: `${menuX}px`, top: `${menuY}px` }"
      @click.stop
    >
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-12.5px text-[var(--app-text-primary)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:bg-[var(--app-bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!menuTab?.closable"
        title="固定 tab 不可关闭"
        @click="closeCurrent"
      >
        <X :size="13" />
        关闭当前
      </button>
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-12.5px text-[var(--app-text-primary)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:bg-[var(--app-bg-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!hasOtherClosable"
        title="仅保留固定 tab 与当前 tab"
        @click="closeOthers"
      >
        <CircleX :size="13" />
        关闭其他
      </button>
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-12.5px text-[var(--app-text-primary)] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:bg-[var(--app-bg-hover)]"
        @click="closeAll"
      >
        <ListX :size="13" />
        关闭所有
      </button>
    </div>
  </Teleport>
</template>