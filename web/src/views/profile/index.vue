<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Lock } from "lucide-vue-next";
import { LewButton, LewForm, LewMessage } from "lew-ui";
import type { LewFormOption } from "lew-ui";
import { changePassword, getProfile, updateProfile } from "~/api/auth";
import { uploadFile } from "~/api/files";
import { useUserStore } from "~/store/user";

const userStore = useUserStore();

// ---------- 资料 ----------
const profileRef = ref();
const profile = ref({
  displayName: userStore.username,
  email: "",
  phone: "",
  avatar: "",
});

const profileOptions: LewFormOption[] = [
  {
    field: "displayName",
    label: "显示名称",
    as: "input",
    rule: "Yup.string().required('不能为空')",
    props: { clearable: true },
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

async function loadProfile() {
  const data = await getProfile();
  profile.value = {
    displayName: data.displayName || userStore.username,
    email: data.email ?? "",
    phone: data.phone ?? "",
    avatar: data.avatar ?? "",
  };
  // 同步到 store，顶栏头像随之更新
  userStore.setProfile({
    displayName: data.displayName,
    email: data.email,
    phone: data.phone,
    avatar: data.avatar,
  });
}
void onMounted(loadProfile);

async function handleSaveProfile() {
  const valid = await profileRef.value?.validate();
  if (!valid) return;
  // 用 getForm 读取表单当前值，确保拿到用户真实输入
  const values = (profileRef.value?.getForm?.() ?? profile.value) as typeof profile.value;
  const avatar = profile.value.avatar || null;
  await updateProfile({
    displayName: values.displayName || userStore.username,
    email: values.email || null,
    phone: values.phone || null,
    avatar,
  });
  userStore.setProfile({ ...values, avatar });
  LewMessage.success("资料已更新");
}

// ---------- 头像上传 ----------
const avatarInput = ref<HTMLInputElement | null>(null);

function triggerAvatarSelect() {
  avatarInput.value?.click();
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // 允许重复选择同一文件
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    LewMessage.error("请选择图片文件");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    LewMessage.error("头像图片不能超过 2MB");
    return;
  }
  const result = await uploadFile(file);
  profile.value.avatar = result.url;
  LewMessage.success("头像已上传，保存资料后生效");
}

function removeAvatar() {
  profile.value.avatar = "";
  LewMessage.success("头像已移除，保存资料后生效");
}

// ---------- 改密码 ----------
const passwordRef = ref();
const password = ref({ oldPassword: "", newPassword: "", confirmPassword: "" });

const passwordOptions: LewFormOption[] = [
  {
    field: "oldPassword",
    label: "原密码",
    as: "input",
    rule: "Yup.string().required('不能为空')",
    props: { type: "password", clearable: true, showPassword: true },
  },
  {
    field: "newPassword",
    label: "新密码",
    as: "input",
    rule: "Yup.string().required('不能为空').min(8, '至少 8 个字符')",
    props: { type: "password", placeholder: "最少 8 位", clearable: true, showPassword: true },
  },
  {
    field: "confirmPassword",
    label: "确认密码",
    as: "input",
    rule: "Yup.string().required('不能为空')",
    props: { type: "password", clearable: true, showPassword: true },
  },
];

async function handleChangePassword() {
  const valid = await passwordRef.value?.validate();
  if (!valid) return;
  // 用 getForm 读取表单当前值，确保拿到用户真实输入
  const values = (passwordRef.value?.getForm?.() ?? password.value) as typeof password.value;
  if (values.newPassword !== values.confirmPassword) {
    LewMessage.error("两次输入的新密码不一致");
    return;
  }
  await changePassword({
    oldPassword: values.oldPassword,
    newPassword: values.newPassword,
  });
  LewMessage.success("密码修改成功");
  password.value = { oldPassword: "", newPassword: "", confirmPassword: "" };
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
        <div class="flex items-center gap-4 mb-5">
          <img
            v-if="profile.avatar"
            :src="profile.avatar"
            alt="avatar"
            class="w-64px h-64px rounded-full object-cover border border-[var(--app-border)]"
          />
          <span
            v-else
            class="flex items-center justify-center w-64px h-64px rounded-full bg-[var(--lew-color-primary)] text-white text-24px font-700"
          >
            {{ userStore.username.slice(0, 1).toUpperCase() }}
          </span>
          <div class="flex-1">
            <div class="text-15px font-600">{{ userStore.username }}</div>
            <div class="mb-2 text-12.5px text-[var(--app-text-muted)]">
              角色：{{ userStore.roles.join(", ") || "-" }}
            </div>
            <div class="flex items-center gap-2">
              <LewButton type="light" size="small" @click="triggerAvatarSelect">更换头像</LewButton>
              <LewButton
                v-if="profile.avatar"
                type="text"
                size="small"
                color="error"
                @click="removeAvatar"
              >
                移除
              </LewButton>
            </div>
            <!-- 隐藏的文件选择框，仅用于触发上传 -->
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleAvatarChange"
            />
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