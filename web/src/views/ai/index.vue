<script setup lang="ts">
import { ref } from 'vue';
import { Bot } from 'lucide-vue-next';
import { useAiChat } from './composables/useAiChat';
import ChatInput from './components/ChatInput.vue';
import DetailPanel from './components/DetailPanel.vue';
import MessageArea from './components/MessageArea.vue';
import SessionList from './components/SessionList.vue';

// ---------- 布局折叠状态 ----------
const leftCollapsed = ref(false);
const rightCollapsed = ref(true);

// ---------- 核心逻辑 ----------
const {
  sessions,
  currentSession,
  messages,
  input,
  sending,
  thinking,
  toolCalls,
  waitingApproval,
  riskLevel,
  pendingApproval,
  approving,
  currentTaskId,
  taskSteps,
  taskStatus,
  rollbacking,
  taskHistory,
  handleCreateSession,
  selectSession,
  handleRenameSession,
  handleSend,
  handleApprove,
  handleReject,
  handleRollbackTask,
} = useAiChat();
</script>

<template>
  <div class="flex h-full gap-3 p-3">
    <!-- 左侧：会话列表 -->
    <SessionList
      :sessions="sessions"
      :current-session="currentSession"
      :collapsed="leftCollapsed"
      @create="handleCreateSession"
      @select="selectSession"
      @rename="handleRenameSession"
      @toggle="leftCollapsed = !leftCollapsed"
    />

    <!-- 中间：对话 -->
    <section
      class="flex flex-col flex-1 min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg-card)]"
    >
      <div
        class="flex items-center gap-2 px-4 py-3 border-b border-[var(--app-border)]"
      >
        <Bot :size="18" class="text-[var(--lew-color-primary)]" />
        <span class="text-14px font-600">AI Operations</span>
        <span
          v-if="currentSession"
          class="text-12px text-[var(--app-text-muted)] ml-2"
        >
          {{ currentSession.title }}
        </span>
      </div>

      <MessageArea
        :messages="messages"
        :thinking="thinking"
        :pending-approval="pendingApproval"
        :approving="approving"
        @confirm="handleApprove"
        @cancel="handleReject"
      />

      <ChatInput
        v-model="input"
        :sending="sending"
        :disabled="!currentSession"
        @send="handleSend"
      />
    </section>

    <!-- 右侧：操作详情 -->
    <DetailPanel
      :collapsed="rightCollapsed"
      :risk-level="riskLevel"
      :waiting-approval="waitingApproval"
      :tool-calls="toolCalls"
      :current-task-id="currentTaskId"
      :task-steps="taskSteps"
      :task-status="taskStatus"
      :rollbacking="rollbacking"
      :task-history="taskHistory"
      @toggle="rightCollapsed = !rightCollapsed"
      @rollback="handleRollbackTask"
    />
  </div>
</template>
