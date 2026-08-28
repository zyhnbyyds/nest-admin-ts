<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LewMenu } from "lew-ui";
import type { LewMenuOption } from "lew-ui";
import type { SidebarItem } from "~/types/app";
import { resolveMenuIcon } from "~/utils/menu-icon";

const props = defineProps<{
  items: SidebarItem[];
  collapsed: boolean;
}>();

const route = useRoute();
const router = useRouter();

/** 当前选中菜单 value（路由路径） */
const activeValue = computed(() => route.path);

/** SidebarItem[] → LewMenuOption[]（分组标题 + 子菜单项） */
const menuOptions = computed<LewMenuOption[]>(() =>
  props.items.map((item) => ({
    label: item.label,
    children: (item.children?.length ? item.children : [item]).map((child) => ({
      label: child.label,
      value: child.path,
      icon: () => h(resolveMenuIcon(child.icon), { size: 14 }),
    })),
  })),
);

/** 折叠态：仅图标按钮列表 */
const collapsedItems = computed(() =>
  props.items.flatMap((item) => (item.children?.length ? item.children : [item])),
);

function handleChange(item: LewMenuOption) {
  if (item.value) router.push(item.value);
}

function go(path: string) {
  router.push(path);
}
</script>

<template>
  <!-- 展开态：使用 lew-ui LewMenu 组件 -->
  <nav v-if="!collapsed" class="flex-1 overflow-y-auto p-2">
    <LewMenu :options="menuOptions" :model-value="activeValue" @change="handleChange" />
  </nav>

  <!-- 折叠态：仅图标 -->
  <nav v-else class="flex-1 overflow-y-auto p-2 flex flex-col items-center gap-1">
    <button
      v-for="item in collapsedItems"
      :key="item.key"
      class="icon-btn !w-36px !h-36px"
      :class="{
        '!bg-[var(--lew-color-primary-light)] !text-[var(--lew-color-primary)]':
          activeValue === item.path,
      }"
      :title="item.label"
      @click="go(item.path)"
    >
      <component :is="resolveMenuIcon(item.icon)" :size="14" />
    </button>
  </nav>
</template>
