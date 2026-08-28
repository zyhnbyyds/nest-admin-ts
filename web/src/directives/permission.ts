import type { Directive, DirectiveBinding } from "vue";
import { useUserStore } from "~/store/user";

/**
 * v-permission 按钮级权限指令
 * 用法：v-permission="'system:user:create'" 或 v-permission="['a:b:c', 'd:e:f']"
 * 无权限时直接移除元素（不渲染）
 */
export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const userStore = useUserStore();
    const required = binding.value;
    if (!required) return;
    if (!userStore.hasPermission(required)) {
      el.parentNode?.removeChild(el);
    }
  },
};

export default permission;
