<script setup lang="ts">
import { useRouter } from "vue-router";
import { Moon, Palette, Sun } from "lucide-vue-next";
import { LewDropdown, LewMessage } from "lew-ui";
import type { LewContextMenusOption } from "lew-ui";
import { logout as logoutApi } from "~/api/auth";
import { useUserStore } from "~/store/user";
import { useSettingsStore } from "~/store/settings";
import { resetRouteFlag } from "~/router/guard";

const emit = defineEmits<{ openTheme: [] }>();

const router = useRouter();
const userStore = useUserStore();
const settings = useSettingsStore();

async function handleLogout() {
  try {
    await logoutApi(userStore.refreshToken);
  } catch {
    // 后端登出失败不阻塞前端登出
  }
  userStore.reset();
  resetRouteFlag();
  LewMessage.success("已退出登录");
  router.push("/login");
}

function handleUserMenu(option: LewContextMenusOption) {
  if (option.value === "profile") {
    router.push("/profile");
  } else if (option.value === "logout") {
    void handleLogout();
  }
}

function toggleDark() {
  settings.setMode(settings.isDark ? "light" : "dark");
}
</script>

<template>
  <header
    class="flex items-center justify-between h-14 px-4 shrink-0 bg-[var(--app-bg-card)] border-b border-[var(--app-border)]"
  >
    <div>
      <span class="text-15px font-600">{{ $route.meta.title ?? "" }}</span>
    </div>

    <div class="flex items-center gap-2">
      <!-- 暗色切换 -->
      <button class="icon-btn" title="切换暗色模式" @click="toggleDark">
        <Moon v-if="!settings.isDark" :size="17" />
        <Sun v-else :size="17" />
      </button>

      <!-- 主题面板 -->
      <button class="icon-btn" title="主题设置" @click="emit('openTheme')">
        <Palette :size="17" />
      </button>

      <!-- 用户菜单 -->
      <LewDropdown
        trigger="click"
        :options="[
          { label: '个人中心', value: 'profile' },
          { label: '退出登录', value: 'logout' },
        ]"
        @change="handleUserMenu"
      >
        <button
          class="flex items-center gap-2 py-1 pr-2.5 pl-1 border-none rounded-full bg-transparent cursor-pointer transition-colors duration-200 hover:bg-[var(--app-bg-hover)]"
        >
          <span
            class="flex items-center justify-center w-26px h-26px rounded-full bg-[var(--lew-color-primary)] text-white text-12px font-700"
          >
            {{ userStore.username.slice(0, 1).toUpperCase() }}
          </span>
          <span class="text-13px text-[var(--app-text-primary)]">{{ userStore.username }}</span>
        </button>
      </LewDropdown>
    </div>
  </header>
</template>
