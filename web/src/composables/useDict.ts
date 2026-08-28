import { ref } from "vue";
import { getDictByType } from "~/api/system/dict";

export interface DictOption {
  label: string;
  value: string;
  cssClass: string | null;
  listClass: string | null;
}

const cache = new Map<string, DictOption[]>();

/**
 * 字典数据复用逻辑
 * const { options, load } = useDict('user_gender')
 */
export function useDict(type: string) {
  const options = ref<DictOption[]>(cache.get(type) ?? []);
  const loading = ref(false);

  async function load(force = false) {
    if (!force && cache.has(type)) {
      options.value = cache.get(type)!;
      return;
    }
    loading.value = true;
    try {
      const data = await getDictByType(type);
      const list: DictOption[] = data.map((item) => ({
        label: item.label,
        value: item.value,
        cssClass: item.cssClass,
        listClass: item.listClass,
      }));
      cache.set(type, list);
      options.value = list;
    } finally {
      loading.value = false;
    }
  }

  function labelOf(value: string): string {
    return options.value.find((item) => item.value === value)?.label ?? value;
  }

  if (!cache.has(type)) {
    void load();
  }

  return { options, loading, load, labelOf };
}

/** 清空字典缓存（字典数据变更后调用） */
export function clearDictCache(type?: string) {
  if (type) cache.delete(type);
  else cache.clear();
}
