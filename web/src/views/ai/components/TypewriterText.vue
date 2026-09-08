<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import MarkdownContent from "./MarkdownContent.vue";

const props = withDefaults(
  defineProps<{
    /** 完整 Markdown 文本 */
    text: string;
    /** 是否播放打字机（false 时直接完整显示，不做动画） */
    active?: boolean;
    /** 每个时间片追加的字符数 */
    chunk?: number;
    /** 时间片间隔 ms */
    interval?: number;
  }>(),
  { active: true, chunk: 10, interval: 20 },
);

const emit = defineEmits<{
  (e: "done"): void;
  (e: "scroll"): void;
}>();

/** 当前已显示的文本 */
const shown = ref("");
const playing = ref(false);

let timer: ReturnType<typeof setInterval> | null = null;

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function finish() {
  stop();
  shown.value = props.text;
  playing.value = false;
  emit("done");
}

function start() {
  stop();
  shown.value = "";
  playing.value = true;
  if (!props.text || props.text.length <= props.chunk) {
    finish();
    return;
  }
  timer = setInterval(() => {
    shown.value = props.text.slice(0, shown.value.length + props.chunk);
    void nextTick(() => emit("scroll"));
    if (shown.value.length >= props.text.length) {
      finish();
    }
  }, props.interval);
}

watch(
  () => [props.text, props.active] as const,
  ([text, active]) => {
    if (!active) {
      stop();
      shown.value = text;
      playing.value = false;
      emit("done");
      return;
    }
    start();
  },
  { immediate: true },
);

onBeforeUnmount(stop);
</script>

<template>
  <MarkdownContent :content="shown" />
</template>
