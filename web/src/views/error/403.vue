<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { LewButton } from "lew-ui";

const router = useRouter();
const countdown = ref(3);

setTimeout(() => {
  const timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(timer);
      router.push("/");
    }
  }, 1000);
});
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-3">
    <h1 class="m-0 text-96px font-800 tracking--4% text-[var(--lew-color-primary)] opacity-85">
      403
    </h1>
    <p class="mt-0 mb-3 text-[var(--app-text-secondary)]">抱歉，你没有访问该页面的权限</p>
    <LewButton type="light" @click="router.push('/')">返回首页（{{ countdown }}s）</LewButton>
  </div>
</template>
