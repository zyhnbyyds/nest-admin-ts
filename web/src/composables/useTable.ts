import { computed, ref, shallowRef } from "vue";
import type { PageResult } from "~/types/api";
import { get } from "~/request";

export interface UseTableOptions<T, Q extends Record<string, unknown>> {
  /** 请求路径 */
  url: string;
  /** 额外查询参数（响应式） */
  query?: () => Q;
  /** 默认分页大小 */
  defaultPageSize?: number;
  /** 数据加载后转换 */
  transform?: (items: T[]) => T[];
}

/**
 * 通用表格分页逻辑
 * 后端分页响应无 total 字段，通过多取一条判断 hasMore 估算 total
 */
export function useTable<
  T extends { id: number },
  Q extends Record<string, unknown> = Record<string, unknown>,
>(options: UseTableOptions<T, Q>) {
  const pageSize = ref(options.defaultPageSize ?? 20);
  const currentPage = ref(1);
  const items = shallowRef<T[]>([]);
  const loading = ref(false);
  const hasMore = ref(false);

  const total = computed(() => {
    // 估算 total：当前页满页且有下一页 → page*pageSize+1，否则 page*pageSize
    if (hasMore.value) return currentPage.value * pageSize.value + 1;
    return (currentPage.value - 1) * pageSize.value + items.value.length;
  });

  async function fetchPage(page = currentPage.value) {
    loading.value = true;
    try {
      const extraQuery = options.query?.() ?? ({} as Q);
      // 多取一条用于判断 hasMore
      const data = await get<PageResult<T>>(options.url, {
        page,
        pageSize: pageSize.value + 1,
        ...extraQuery,
      });
      const list = data.items.slice(0, pageSize.value);
      hasMore.value = data.items.length > pageSize.value;
      items.value = options.transform ? options.transform(list) : list;
      currentPage.value = data.page;
    } finally {
      loading.value = false;
    }
  }

  function search() {
    currentPage.value = 1;
    return fetchPage(1);
  }

  function refresh() {
    return fetchPage(currentPage.value);
  }

  function handleChange(data: { currentPage: number; pageSize: number }) {
    pageSize.value = data.pageSize;
    return fetchPage(data.currentPage);
  }

  return {
    items,
    loading,
    currentPage,
    pageSize,
    total,
    hasMore,
    fetchPage,
    search,
    refresh,
    handleChange,
  };
}
