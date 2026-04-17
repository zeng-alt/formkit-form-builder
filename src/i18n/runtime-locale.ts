import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { dateEnUS, dateZhCN, enUS, zhCN, type NDateLocale, type NLocale } from 'naive-ui'

export type RuntimeLocale = 'zh-CN' | 'en'

type RuntimeLocaleContext = {
  locale: Ref<RuntimeLocale>
  setLocale: (next: RuntimeLocale) => void
  naiveLocale: ComputedRef<NLocale>
  naiveDateLocale: ComputedRef<NDateLocale>
}

const RUNTIME_LOCALE_KEY: InjectionKey<RuntimeLocaleContext> = Symbol('FormBuilderRuntimeLocale')

export function provideRuntimeLocale(initialLocale: RuntimeLocale) {
  const locale = ref<RuntimeLocale>(initialLocale)

  const naiveLocale = computed(() => (locale.value === 'zh-CN' ? zhCN : enUS))
  const naiveDateLocale = computed(() => (locale.value === 'zh-CN' ? dateZhCN : dateEnUS))

  const setLocale: RuntimeLocaleContext['setLocale'] = (next) => {
    locale.value = next
  }

  const ctx: RuntimeLocaleContext = {
    locale,
    setLocale,
    naiveLocale,
    naiveDateLocale,
  }

  provide(RUNTIME_LOCALE_KEY, ctx)
  return ctx
}

export function useRuntimeLocale() {
  const fallbackLocale = ref<RuntimeLocale>('zh-CN')
  return inject(RUNTIME_LOCALE_KEY, {
    locale: fallbackLocale,
    setLocale: (next) => {
      fallbackLocale.value = next
    },
    naiveLocale: computed(() => (fallbackLocale.value === 'zh-CN' ? zhCN : enUS)),
    naiveDateLocale: computed(() => (fallbackLocale.value === 'zh-CN' ? dateZhCN : dateEnUS)),
  })
}
