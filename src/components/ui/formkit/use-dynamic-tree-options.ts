import { computed, ref, watch, type ComputedRef } from 'vue'
import { parseDynamicSource, useDictionary } from '@/composables/use-dictionary'
import type { TreeDictionaryOption } from '@/types/env'

/**
 * 动态树型字典选项：当 optionsRaw 是 { dynamic:true, code, label? } 时，
 * 用 config.fetchTreeDictionary(code) 拉取树型结构 [{label,key,children?}] 供树选择/级联选择渲染。
 */
export function useDynamicTreeOptions(optionsRaw: ComputedRef<unknown>) {
  const { fetchTreeDictionary } = useDictionary()

  const dynamic = computed(() => parseDynamicSource(optionsRaw.value))
  const isDynamic = computed(() => dynamic.value !== null)
  const dynamicOptions = ref<TreeDictionaryOption[]>([])
  const dynamicLoadError = ref<string | undefined>()

  watch(
    dynamic,
    async (source) => {
      if (!source) {
        dynamicOptions.value = []
        dynamicLoadError.value = undefined
        return
      }
      if (!fetchTreeDictionary) {
        dynamicOptions.value = []
        return
      }
      try {
        dynamicOptions.value = await fetchTreeDictionary(source.code)
        dynamicLoadError.value = undefined
      } catch (e) {
        dynamicOptions.value = []
        dynamicLoadError.value = (e as Error)?.message
      }
    },
    { immediate: true },
  )

  return { isDynamic, dynamicOptions, dynamicLoadError }
}
