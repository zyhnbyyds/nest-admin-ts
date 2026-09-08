<script setup lang="ts">
import { Bot, ChevronsLeft, ChevronsRight, Plus } from "lucide-vue-next";
import { LewButton } from "lew-ui";
import { formatDateTime } from "~/composables/useFormat";
import type { AiSession } from "~/types/api";

defineProps<{
  sessions: AiSession[];
  currentSession: AiSession | null;
  collapsed: boolean;
}>();

const emit = defineEmits<{
  (e: "create"): void;
  (e: "select", id: number): void;
  (e: "toggle"): void;
}>();
</script>

<template>
  <aside
    class="flex flex-col shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)] overflow-hidden transition-[width] duration-200"
    :style="{ width: collapsed ? '48px' : '224px' }"
  >
    <!-- 头部 -->
    <div
      class="flex items-center justify-between h-12 shrink-0 px-3 border-b border-[var(--app-border)]"
      :class="{ 'px-2 justify-center': collapsed }"
    >
      <template v-if="!collapsed">
        <span class="text-14px font-600">会话</span>
        <LewButton size="small" @click="emit('create')">
          <template #icon><Plus :size="14" /></template>
          新建
        </LewButton>
      </template>
      <LewButton v-else size="small" single-icon @click="emit('create')">
        <template #icon><Plus :size="16" /></template>
      </LewButton>
    </div>

    <!-- 会话列表 -->
    <div class="flex-1 overflow-y-auto p-2">
      <template v-if="!collapsed">
        <div
          v-for="session in sessions"
          :key="session.id"
          class="flex items-center gap-2 px-2 py-2 mb-1 rounded-md cursor-pointer text-13px transition-colors"
          :class="
            currentSession?.id === session.id
              ? 'bg-[var(--lew-color-primary)] text-white'
              : 'hover:bg-[var(--app-bg-hover)]'
          "
          @click="emit('select', session.id)"
        >
          <div
            class="w-7 h-7 shrink-0 flex items-center justify-center rounded-full"
            :class="
              currentSession?.id === session.id
                ? 'bg-white/20'
                : 'bg-[var(--lew-color-primary-light)]'
            "
          >
            <Bot
              :size="14"
              :color="currentSession?.id === session.id ? '#fff' : 'var(--lew-color-primary)'"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="truncate">{{ session.title }}</div>
            <div
              class="text-11px mt-0.5"
              :class="
                currentSession?.id === session.id ? 'text-white/70' : 'text-[var(--app-text-muted)]'
              "
            >
              {{ formatDateTime(session.updatedAt) }}
            </div>
          </div>
        </div>
        <div
          v-if="!sessions.length"
          class="text-12px text-[var(--app-text-muted)] text-center py-8"
        >
          暂无会话，点击「新建」开始对话
        </div>
      </template>
      <!-- 折叠态：只显示会话图标 -->
      <div v-else class="flex flex-col items-center gap-2 pt-2">
        <div
          v-for="session in sessions.slice(0, 6)"
          :key="session.id"
          class="w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-colors"
          :class="
            currentSession?.id === session.id
              ? 'bg-[var(--lew-color-primary)] text-white'
              : 'text-[var(--app-text-muted)] hover:bg-[var(--app-bg-hover)]'
          "
          :title="session.title"
          @click="emit('select', session.id)"
        >
          <Bot :size="15" />
        </div>
      </div>
    </div>

    <!-- 折叠按钮 -->
    <div
      class="flex items-center justify-center h-9 shrink-0 cursor-pointer text-[var(--app-text-muted)] border-t border-[var(--app-border)] transition-colors hover:text-[var(--app-text-primary)] hover:bg-[var(--app-bg-hover)]"
      @click="emit('toggle')"
    >
      <ChevronsLeft v-if="!collapsed" :size="16" />
      <ChevronsRight v-else :size="16" />
    </div>
  </aside>
</template>
