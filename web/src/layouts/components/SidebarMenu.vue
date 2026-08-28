<script setup lang="ts">
import type { SidebarItem } from "~/types/app";

defineProps<{
  items: SidebarItem[];
  collapsed: boolean;
}>();
</script>

<template>
  <nav class="flex-1 overflow-y-auto p-2" :class="{ collapsed }">
    <template v-for="item in items" :key="item.key">
      <!-- 有子菜单：分组 -->
      <div v-if="item.children?.length" class="mb-1">
        <div
          class="flex items-center px-3 pt-2.5 pb-1.5 text-12px font-600 text-[var(--app-text-muted)] tracking-0.2%"
        >
          <span v-if="!collapsed">{{ item.label }}</span>
          <span v-else class="w-1 h-1 rounded-full bg-[var(--app-text-muted)]" />
        </div>
        <RouterLink
          v-for="child in item.children"
          :key="child.key"
          :to="child.path"
          class="menu-link"
          active-class="menu-link-active"
        >
          {{ child.label }}
        </RouterLink>
      </div>

      <!-- 无子菜单：直接链接 -->
      <RouterLink v-else :to="item.path" class="menu-link" active-class="menu-link-active">
        {{ item.label }}
      </RouterLink>
    </template>
  </nav>
</template>

<style scoped>
/* RouterLink active 状态需要组合选择器，保留少量 CSS */
.menu-link {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 2px;
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--app-text-secondary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  transition:
    background var(--app-transition),
    color var(--app-transition);
}

.menu-link:hover {
  background: var(--app-bg-hover);
  color: var(--app-text-primary);
}

.menu-link-active {
  background: var(--lew-color-primary-light);
  color: var(--lew-color-primary);
  font-weight: 600;
}

.collapsed .menu-link {
  justify-content: center;
  padding: 8px 0;
  font-size: 0;
}
</style>
