<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Bot, Maximize, Minimize, X } from 'lucide-vue-next';
import AiChatPage from '~/views/ai/index.vue';

/**
 * AI 操作助手弹出面板：由 Header 图标触发，从底部滑出。
 *
 * 内容复用 views/ai/index.vue；Esc / 遮罩 / 右上角关闭。
 */
const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

const route = useRoute();
const fullscreen = ref(false);

function close() {
  emit('update:visible', false);
}

// 每次重新打开时恢复为非全屏
watch(
  () => props.visible,
  (v) => {
    if (!v) fullscreen.value = false;
  },
);

// 路由切换时关闭面板（避免面板叠在其它整页之上）
watch(
  () => route.path,
  () => {
    if (props.visible) close();
  },
);

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.visible) close();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="props.visible"
        class="fixed inset-0 z-1200 bg-black/45"
        @click="close"
      />
    </Transition>

    <Transition name="rise">
      <section
        v-if="props.visible"
        class="ai-sheet fixed z-1201 flex flex-col overflow-hidden bg-[var(--app-bg-card)] shadow-2xl"
        :class="
          fullscreen
            ? 'inset-0 rounded-none'
            : 'left-[15%] right-[15%] top-[20%] bottom-0 rounded-t-2xl'
        "
      >
        <!-- 面板工具条 -->
        <div
          class="flex items-center gap-2 h-12 shrink-0 px-4 border-b border-[var(--app-border)] bg-[var(--app-bg-card)]"
        >
          <Bot :size="17" class="text-[var(--lew-color-primary)]" />
          <span class="text-15px font-700">AI 操作助手</span>
          <span class="text-12px text-[var(--app-text-muted)]">
            Esc 或右上角关闭
          </span>
          <div class="ml-auto flex items-center gap-1">
            <button
              type="button"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-hover)] hover:text-[var(--app-text-primary)]"
              :title="fullscreen ? '退出全屏' : '全屏'"
              :aria-label="fullscreen ? '退出全屏' : '全屏'"
              @click="fullscreen = !fullscreen"
            >
              <Maximize v-if="!fullscreen" :size="16" />
              <Minimize v-else :size="16" />
            </button>
            <button
              type="button"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-bg-hover)] hover:text-[var(--app-text-primary)]"
              title="收起"
              aria-label="收起"
              @click="close"
            >
              <X :size="17" />
            </button>
          </div>
        </div>

        <!-- 面板内容：复用 AI 操作页 -->
        <div class="flex-1 min-h-0 overflow-hidden">
          <AiChatPage />
        </div>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 全屏/还原：尺寸与圆角平滑过渡 */
.ai-sheet {
  transition:
    left 0.3s ease,
    right 0.3s ease,
    top 0.3s ease,
    bottom 0.3s ease,
    border-radius 0.3s ease;
}

/* ---------- 面板动画 ---------- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.rise-enter-active,
.rise-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.rise-enter-from,
.rise-leave-to {
  transform: translateY(100%);
}
</style>
