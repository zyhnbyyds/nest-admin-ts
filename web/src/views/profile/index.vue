<script setup lang="ts">
import { ref } from "vue";
import { Lock } from "lucide-vue-next";
import { LewButton, LewForm, LewMessage } from "lew-ui";
import type { LewFormOption } from "lew-ui";
import { useUserStore } from "~/store/user";

const userStore = useUserStore();

// ---------- 资料 ----------
const profileRef = ref();
const profile = ref({
  displayName: userStore.username,
  email: "",
  phone: "",
});

const profileOptions: LewFormOption[] = [
  { field: "displayName", label: "显示名称", as: "input", props: { clearable: true } },
  { field: "email", label: "邮箱", as: "input", props: { placeholder: "选填", clearable: true } },
  { field: "phone", label: "手机号", as: "input", props: { placeholder: "选填", clearable: true } },
];

async function handleSaveProfile() {
  const valid = await profileRef.value?.validate();
  if (!valid) return;
  // 后端暂无独立 profile 接口，资料修改走用户更新接口（需 system:user:update 权限）
  LewMessage.info("当前后端未提供个人资料独立接口，请联系管理员修改");
}

// ---------- 改密码 ----------
const passwordRef = ref();
const password = ref({ oldPassword: "", newPassword: "", confirmPassword: "" });

const passwordOptions: LewFormOption[] = [
  {
    field: "oldPassword",
    label: "原密码",
    as: "input",
    rule: "required",
    props: { type: "password", clearable: true, showPassword: true },
  },
  {
    field: "newPassword",
    label: "新密码",
    as: "input",
    rule: "required",
    props: { type: "password", placeholder: "最少 12 位", clearable: true, showPassword: true },
  },
  {
    field: "confirmPassword",
    label: "确认密码",
    as: "input",
    rule: "required",
    props: { type: "password", clearable: true, showPassword: true },
  },
];

async function handleChangePassword() {
  const valid = await passwordRef.value?.validate();
  if (!valid) return;
  if (password.value.newPassword !== password.value.confirmPassword) {
    LewMessage.error("两次输入的新密码不一致");
    return;
  }
  if (password.value.newPassword.length < 12) {
    LewMessage.error("新密码最少 12 位");
    return;
  }
  // 后端暂无改密码接口
  LewMessage.info("当前后端未提供修改密码接口");
}
</script>

<template>
  <div class="page-container">
    <!-- 页头 -->
    <div>
      <h2 class="page-title m-0">个人中心</h2>
      <p class="page-subtitle mt-1 mb-0">管理个人资料与密码</p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <!-- 资料 -->
      <div class="app-card p-6">
        <h3 class="mt-0 mb-4 text-15px font-600">个人资料</h3>
        <div class="flex items-center gap-3 mb-5">
          <span
            class="flex items-center justify-center w-48px h-48px rounded-full bg-[var(--lew-color-primary)] text-white text-20px font-700"
          >
            {{ userStore.username.slice(0, 1).toUpperCase() }}
          </span>
          <div>
            <div class="text-15px font-600">{{ userStore.username }}</div>
            <div class="text-12.5px text-[var(--app-text-muted)]">
              角色：{{ userStore.roles.join(", ") || "-" }}
            </div>
          </div>
        </div>
        <LewForm ref="profileRef" v-model="profile" :options="profileOptions" label-width="72px" />
        <LewButton class="mt-4" type="fill" @click="handleSaveProfile">保存资料</LewButton>
      </div>

      <!-- 改密码 -->
      <div class="app-card p-6">
        <h3 class="mt-0 mb-4 flex items-center gap-1.5 text-15px font-600">
          <Lock :size="16" /> 修改密码
        </h3>
        <LewForm
          ref="passwordRef"
          v-model="password"
          :options="passwordOptions"
          label-width="72px"
        />
        <LewButton class="mt-4" type="fill" @click="handleChangePassword">修改密码</LewButton>
      </div>
    </div>
  </div>
</template>
