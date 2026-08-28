<script setup lang="ts">
import { useRouter } from "vue-router";
import { LewButton } from "lew-ui";

const router = useRouter();
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-3">
    <h1 class="m-0 text-96px font-800 tracking--4% text-[var(--lew-color-primary)] opacity-85">
      404
    </h1>
    <p class="mt-0 mb-3 text-[var(--app-text-secondary)]">页面不存在或已被移除</p>
    <LewButton type="light" @click="router.push('/')">返回首页</LewButton>
  </div>
</template>
