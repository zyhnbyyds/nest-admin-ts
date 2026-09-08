<script setup lang="ts">
import { MdPreview } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import DOMPurify from "dompurify";
import { useSettingsStore } from "~/store/settings";

defineProps<{
  /** Markdown 内容 */
  content: string;
}>();

const settings = useSettingsStore();
const sanitize = (html: string) => DOMPurify.sanitize(html);
</script>

<template>
  <MdPreview
    :model-value="content"
    :theme="settings.isDark ? 'dark' : 'light'"
    :sanitize="sanitize"
    preview-theme="github"
    class="ai-md-preview"
  />
</template>
