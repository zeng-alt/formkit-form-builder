import { computed, ref, watch, type ComputedRef } from 'vue'
import { parseDynamicSource, useDictionary } from '@/composables/use-dictionary'
import type { DictionaryOption } from '@/types/env'

/**
 * 动态字典选项：当 optionsRaw 是 { dynamic:true, code, label? } 时，
 * 用 config.fetchDictionary(code) 拉取 [{label,value}] 供单选/多选/下拉渲染。
 */
export function useDynamicOptions(optionsRaw: ComputedRef<unknown>) {
  const { fetchDictionary } = useDictionary()

  const dynamic = computed(() => parseDynamicSource(optionsRaw.value))
  const isDynamic = computed(() => dynamic.value !== null)
  const dynamicOptions = ref<DictionaryOption[]>([])
  const dynamicLoadError = ref<string | undefined>()

  watch(
    dynamic,
    async (source) => {
      if (!source) {
        dynamicOptions.value = []
        dynamicLoadError.value = undefined
        return
      }
      if (!fetchDictionary) {
        dynamicOptions.value = []
        return
      }
      try {
        dynamicOptions.value = await fetchDictionary(source.code)
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
