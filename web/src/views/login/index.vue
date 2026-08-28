<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LewButton, LewForm, LewMessage } from "lew-ui";
import type { LewFormOption } from "lew-ui";
import { login } from "~/api/auth";
import { resetRouteFlag } from "~/router/guard";

import { useUserStore } from "~/store/user";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const loading = ref(false);
const formRef = ref();
const form = ref({ username: "admin", password: "" });

const options: LewFormOption[] = [
  {
    field: "username",
    label: "用户名",
    as: "input",
    rule: "required",
    props: { placeholder: "请输入用户名", clearable: true },
  },
  {
    field: "password",
    label: "密码",
    as: "input",
    rule: "required",
    props: { type: "password", placeholder: "请输入密码", clearable: true, showPassword: true },
  },
];

async function handleLogin() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  loading.value = true;
  try {
    const result = await login(form.value);
    userStore.setTokens(result.accessToken, result.refreshToken);
    resetRouteFlag();
    LewMessage.success("登录成功");
    const redirect = (route.query.redirect as string) ?? "/";
    router.push(redirect);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center h-full bg-[var(--app-bg-page)]">
    <div
      class="w-380px px-9 pt-10 pb-8 bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-16px shadow-[var(--app-shadow-hover)]"
    >
      <div class="mb-7 text-center">
        <h1 class="m-0 text-26px font-800 tracking--2% text-[var(--lew-color-primary)]">
          Nest Admin
        </h1>
        <p class="mt-1.5 mb-0 text-13px text-[var(--app-text-muted)]">通用后台管理系统</p>
      </div>

      <LewForm ref="formRef" v-model="form" :options="options" label-width="64px" />

      <LewButton
        class="w-full mt-2"
        type="fill"
        size="large"
        :loading="loading"
        @click="handleLogin"
      >
        登 录
      </LewButton>
    </div>
  </div>
</template>
