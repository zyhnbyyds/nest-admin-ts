<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { LewButton, LewForm, LewMessage, LewTabs } from "lew-ui";
import type { LewFormOption, LewTabsOption } from "lew-ui";
import { login, register } from "~/api/auth";
import { resetRouteFlag } from "~/router/guard";

import { useUserStore } from "~/store/user";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

/** 当前模式：login 登录 / register 注册 */
const mode = ref<"login" | "register">("login");
const isLogin = computed(() => mode.value === "login");

const modeTabs: LewTabsOption[] = [
  { label: "登 录", value: "login" },
  { label: "注 册", value: "register" },
];

const loading = ref(false);
const formRef = ref();

/** 默认登录账号 */
const defaultLogin = { username: "admin", password: "admin123456" };
const form = ref({ ...defaultLogin });

/** LewForm 为受控组件，外部 v-model 初值不生效，需挂载后 setForm 回填默认账号 */
function fillDefaultLogin() {
  form.value = { ...defaultLogin };
  void nextTick(() => {
    formRef.value?.setForm?.(form.value);
  });
}

void onMounted(fillDefaultLogin);

const loginOptions: LewFormOption[] = [
  {
    field: "username",
    label: "用户名",
    as: "input",
    rule: "Yup.string().required('不能为空')",
    props: { placeholder: "请输入用户名", clearable: true },
  },
  {
    field: "password",
    label: "密码",
    as: "input",
    rule: "Yup.string().required('不能为空')",
    props: { type: "password", placeholder: "请输入密码", clearable: true, showPassword: true },
  },
];

const registerForm = ref({
  username: "",
  displayName: "",
  password: "",
  confirmPassword: "",
  email: "",
  phone: "",
});

const registerOptions: LewFormOption[] = [
  {
    field: "username",
    label: "用户名",
    as: "input",
    rule: "Yup.string().required('不能为空').min(3, '至少 3 个字符').max(64, '最多 64 个字符')",
    props: { placeholder: "3-64 个字符", clearable: true },
  },
  {
    field: "displayName",
    label: "显示名称",
    as: "input",
    rule: "Yup.string().required('不能为空')",
    props: { placeholder: "请输入显示名称", clearable: true },
  },
  {
    field: "password",
    label: "密码",
    as: "input",
    rule: "Yup.string().required('不能为空').min(8, '至少 8 个字符')",
    props: { type: "password", placeholder: "最少 8 位", clearable: true, showPassword: true },
  },
  {
    field: "confirmPassword",
    label: "确认密码",
    as: "input",
    rule: "Yup.string().required('不能为空')",
    props: { type: "password", placeholder: "请再次输入密码", clearable: true, showPassword: true },
  },
  {
    field: "email",
    label: "邮箱",
    as: "input",
    rule: "Yup.string().email('邮箱格式不正确').nullable()",
    props: { placeholder: "选填", clearable: true },
  },
  {
    field: "phone",
    label: "手机号",
    as: "input",
    rule: "Yup.string().nullable()",
    props: { placeholder: "选填", clearable: true },
  },
];

function switchMode(next: "login" | "register") {
  mode.value = next;
  // 切换时清空表单，避免残留
  if (next === "login") {
    // 切回登录时回填默认账号
    fillDefaultLogin();
  } else {
    registerForm.value = {
      username: "",
      displayName: "",
      password: "",
      confirmPassword: "",
      email: "",
      phone: "",
    };
  }
}

async function handleLogin() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  loading.value = true;
  try {
    // LewForm 为受控组件，用 getForm 读取用户真实输入
    const values = (formRef.value?.getForm?.() ?? form.value) as typeof form.value;
    const result = await login(values);
    userStore.setTokens(result.accessToken, result.refreshToken);
    resetRouteFlag();
    LewMessage.success("登录成功");
    const redirect = (route.query.redirect as string) ?? "/";
    router.push(redirect);
  } finally {
    loading.value = false;
  }
}

async function handleRegister() {
  const valid = await formRef.value?.validate();
  if (!valid) return;
  // LewForm 为受控组件，用 getForm 读取用户真实输入
  const values = (formRef.value?.getForm?.() ?? registerForm.value) as typeof registerForm.value;
  if (values.password !== values.confirmPassword) {
    LewMessage.error("两次输入的密码不一致");
    return;
  }
  loading.value = true;
  try {
    const result = await register({
      username: values.username,
      displayName: values.displayName,
      password: values.password,
      email: values.email || undefined,
      phone: values.phone || undefined,
    });
    userStore.setTokens(result.accessToken, result.refreshToken);
    resetRouteFlag();
    LewMessage.success("注册成功，已自动登录");
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
      class="w-400px px-9 pt-10 pb-8 bg-[var(--app-bg-card)] border border-[var(--app-border)] rounded-16px shadow-[var(--app-shadow-hover)]"
    >
      <div class="mb-7 text-center">
        <img
          src="/image/logo.png"
          alt="Nest Admin Logo"
          class="w-56px h-56px mx-auto mb-3 object-contain"
        />
        <h1 class="m-0 text-26px font-800 tracking--2% text-[var(--lew-color-primary)]">
          Nest Admin
        </h1>
        <p class="mt-1.5 mb-0 text-13px text-[var(--app-text-muted)]">通用后台管理系统</p>
      </div>

      <!-- 模式切换 -->
      <div class="mb-6">
        <LewTabs v-model="mode" :options="modeTabs" item-width="49.5%" type="block" width="100%" />
      </div>

      <!-- 登录表单 -->
      <LewForm
        v-if="isLogin"
        ref="formRef"
        v-model="form"
        :options="loginOptions"
        label-width="64px"
      />

      <!-- 注册表单 -->
      <LewForm
        v-else
        ref="formRef"
        v-model="registerForm"
        :options="registerOptions"
        label-width="64px"
      />

      <LewButton
        class="w-full! mt-6"
        type="fill"
        size="large"
        :loading="loading"
        @click="isLogin ? handleLogin() : handleRegister()"
      >
        {{ isLogin ? "登 录" : "注 册" }}
      </LewButton>

      <p class="mt-4 mb-0 text-center text-12.5px text-[var(--app-text-muted)]">
        <template v-if="isLogin">
          还没有账号？
          <a class="text-[var(--lew-color-primary)] cursor-pointer" @click="switchMode('register')">
            立即注册
          </a>
        </template>
        <template v-else>
          已有账号？
          <a class="text-[var(--lew-color-primary)] cursor-pointer" @click="switchMode('login')">
            返回登录
          </a>
        </template>
      </p>
    </div>
  </div>
</template>
