<script setup lang="ts">
import { computed, nextTick, onUpdated, ref } from "vue";
import { Marked } from "marked";
import DOMPurify from "dompurify";

const props = defineProps<{
  /** Markdown 内容 */
  content: string;
}>();

// 轻量渲染：marked 解析（GFM）→ DOMPurify 消毒 → 纯 HTML。
// 无 md-editor-v3 自带样式/容器，观感完全跟随项目主题（见 styles/ai-md.css）。
const md = new Marked({ gfm: true, breaks: false });

const rootEl = ref<HTMLElement | null>(null);

const html = computed(() => {
  const source = props.content ?? "";
  try {
    // 未启用 async 扩展，parse 始终同步返回 string
    return DOMPurify.sanitize(md.parse(source) as string);
  } catch {
    // 解析异常时退化为纯文本展示
    return DOMPurify.sanitize(source);
  }
});

/** 让外部链接在新窗口打开（站内相对链接保持默认） */
function enhanceLinks() {
  const nodes = rootEl.value?.querySelectorAll<HTMLAnchorElement>("a");
  if (!nodes) return;
  nodes.forEach((a) => {
    try {
      if (a.hostname && a.hostname !== window.location.hostname) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
    } catch {
      // 忽略无法解析的链接
    }
  });
}

onUpdated(() => {
  void nextTick(enhanceLinks);
});
</script>

<template>
  <div ref="rootEl" class="ai-md-preview" v-html="html" />
</template>
