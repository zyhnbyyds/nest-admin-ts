<script setup lang="ts">
import { computed, ref } from "vue";
import { Check, Clock, Database, Loader2, X } from "lucide-vue-next";
import { LewCollapse, LewCollapseItem, LewTag } from "lew-ui";
import {
  USER_TABLE_COLUMNS,
  formatArgs,
  isStatusColumn,
  isUserList,
  userCellValue,
} from "../utils/display";

const props = withDefaults(
  defineProps<{
    /** 工具名，如 dept.create */
    name: string;
    /** 工具入参（avoid `arguments`：与渲染函数作用域保留字冲突） */
    args: Record<string, unknown>;
    /** 执行结果（可为空：执行中/待审批） */
    result?: unknown;
    /** 步骤状态 */
    status?: "running" | "success" | "approval" | "error" | "cancelled";
  }>(),
  { result: undefined, status: "success" },
);

// 默认闭合：LewCollapse 的 modelValue 控制展开的 key 集合
const expandedKeys = ref<string[]>([]);

const isWaiting = computed(() => {
  const r = props.result as { status?: string } | undefined;
  return props.status === "approval" || r?.status === "waiting_approval";
});
const isRunning = computed(() => props.status === "running" || props.result === undefined);

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
</script>

<template>
  <div
    class="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] overflow-hidden transition-colors"
    :class="isRunning ? 'border-[var(--lew-color-primary)]/40' : ''"
  >
    <LewCollapse v-model="expandedKeys" :width="'100%'">
      <LewCollapseItem :collapse-key="name" :radius="'0px'">
        <template #title>
          <div class="flex items-center gap-2 w-full min-w-0">
            <Database :size="13" class="shrink-0 text-[var(--lew-color-primary)]" />
            <span class="text-13px font-600 text-[var(--app-text-primary)]">
              {{ name }}
            </span>

            <!-- 状态图标 -->
            <Loader2
              v-if="isRunning"
              :size="12"
              class="ml-1 shrink-0 text-[var(--lew-color-primary)] animate-spin"
            />
            <X
              v-else-if="status === 'cancelled'"
              :size="12"
              class="ml-1 shrink-0 text-[var(--app-text-muted)]"
            />
            <Check v-else-if="!isWaiting" :size="12" class="ml-1 shrink-0 text-green-500" />
            <Clock v-else :size="12" class="ml-1 shrink-0 text-orange-500" />

            <!-- 参数摘要（截断） -->
            <span class="flex-1 min-w-0 text-12px text-[var(--app-text-muted)] truncate ml-1">
              {{ formatArgs(args) }}
            </span>

            <!-- 状态标签 -->
            <LewTag v-if="isWaiting" :type="'light'" color="warning" size="small" class="shrink-0">
              待确认
            </LewTag>
            <LewTag
              v-else-if="status === 'cancelled'"
              :type="'light'"
              color="gray"
              size="small"
              class="shrink-0"
            >
              已取消
            </LewTag>
            <span v-else-if="isRunning" class="shrink-0 text-11px text-[var(--lew-color-primary)]">
              执行中
            </span>
          </div>
        </template>

        <!-- 展开区：参数 + 结果 -->
        <div class="px-3 py-2 space-y-2">
          <!-- 参数 -->
          <div>
            <div class="text-11px text-[var(--app-text-muted)] mb-1">参数</div>
            <pre
              class="text-11.5px text-[var(--app-text-primary)] whitespace-pre-wrap break-all max-h-28 overflow-y-auto rounded-md bg-[var(--app-bg-hover)] p-2"
              >{{ prettyJson(args) }}</pre
            >
          </div>

          <!-- 结果 -->
          <div v-if="isRunning">
            <div class="text-11px text-[var(--app-text-muted)] mb-1">执行中</div>
            <div class="flex items-center gap-1.5 text-11.5px text-[var(--lew-color-primary)]">
              <Loader2 :size="12" class="animate-spin" />
              正在执行，请稍候...
            </div>
          </div>

          <div v-else-if="isWaiting">
            <div class="text-11px text-[var(--app-text-muted)] mb-1">状态</div>
            <pre
              class="text-11.5px text-[var(--app-text-muted)] whitespace-pre-wrap break-all max-h-32 overflow-y-auto rounded-md bg-[var(--app-bg-hover)] p-2"
              >{{ prettyJson(result) }}</pre
            >
          </div>

          <div v-else>
            <div class="text-11px text-[var(--app-text-muted)] mb-1">结果</div>
            <!-- 用户列表 → 表格 -->
            <template v-if="isUserList(result)">
              <div class="text-11.5px text-[var(--app-text-muted)] mb-1.5">
                查询到
                <span class="font-600 text-[var(--lew-color-primary)]">
                  {{ (result as { items: unknown[] }).items.length }}
                </span>
                条记录
              </div>
              <div class="overflow-x-auto rounded-md border border-[var(--app-border)]">
                <table class="w-full text-12px">
                  <thead>
                    <tr class="bg-[var(--app-bg-hover)]">
                      <th
                        v-for="col in USER_TABLE_COLUMNS"
                        :key="col.key"
                        class="px-2.5 py-1.5 text-left font-600 text-[var(--app-text-primary)] whitespace-nowrap"
                      >
                        {{ col.label }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, i) in (result as { items: Array<Record<string, unknown>> })
                        .items"
                      :key="i"
                      class="border-t border-[var(--app-border)] transition-colors hover:bg-[var(--app-bg-hover)]"
                    >
                      <td
                        v-for="col in USER_TABLE_COLUMNS"
                        :key="col.key"
                        class="px-2.5 py-1.5 whitespace-nowrap text-[var(--app-text-primary)]"
                      >
                        <LewTag
                          v-if="isStatusColumn(col.key)"
                          :type="'light'"
                          :color="row.status === 'active' ? 'success' : 'warning'"
                          size="small"
                        >
                          {{ row.status === "active" ? "启用" : "禁用" }}
                        </LewTag>
                        <span
                          v-else
                          :class="col.key === 'id' ? 'text-[var(--app-text-muted)]' : ''"
                        >
                          {{ userCellValue(row, col.key) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <!-- 其他结果 -->
            <pre
              v-else
              class="text-11.5px text-[var(--app-text-muted)] whitespace-pre-wrap break-all max-h-40 overflow-y-auto rounded-md bg-[var(--app-bg-hover)] p-2"
              >{{ prettyJson(result) }}</pre
            >
          </div>

          <!-- 错误/取消结果 -->
          <div
            v-if="status === 'error' || status === 'cancelled'"
            class="flex items-center gap-1.5 text-11.5px"
            :class="status === 'error' ? 'text-red-500' : 'text-[var(--app-text-muted)]'"
          >
            <X :size="12" />
            {{ status === "error" ? "执行失败" : "已取消" }}
          </div>
        </div>
      </LewCollapseItem>
    </LewCollapse>
  </div>
</template>
