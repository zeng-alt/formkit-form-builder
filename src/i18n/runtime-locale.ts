import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { dateEnUS, dateZhCN, enUS, zhCN, type NDateLocale, type NLocale } from 'naive-ui'

export type RuntimeLocale = string

const naiveLocaleMap: Record<string, NLocale> = {
  'zh-CN': zhCN,
  en: enUS,
}

const naiveDateLocaleMap: Record<string, NDateLocale> = {
  'zh-CN': dateZhCN,
  en: dateEnUS,
}

function getNaiveLocale(locale: string): NLocale {
  return naiveLocaleMap[locale] ?? naiveLocaleMap['zh-CN']!
}

function getNaiveDateLocale(locale: string): NDateLocale {
  return naiveDateLocaleMap[locale] ?? naiveDateLocaleMap['zh-CN']!
}

type RuntimeLocaleContext = {
  locale: Ref<RuntimeLocale>
  setLocale: (next: RuntimeLocale) => void
  availableLocales: Ref<{ label: string; value: string }[]>
  localeFallback: Ref<string>
  naiveLocale: ComputedRef<NLocale>
  naiveDateLocale: ComputedRef<NDateLocale>
}

const RUNTIME_LOCALE_KEY: InjectionKey<RuntimeLocaleContext> = Symbol('FormBuilderRuntimeLocale')

export function provideRuntimeLocale(options: {
  initialLocale: RuntimeLocale
  availableLocales?: string[]
  localeFallback?: string
}) {
  const { initialLocale, availableLocales = ['zh-CN', 'en'], localeFallback = 'zh-CN' } = options

  const locale = ref<RuntimeLocale>(initialLocale)
  const localeFallbackRef = ref<string>(localeFallback)

  const availableLocalesRef = computed<{ label: string; value: string }[]>(() =>
    availableLocales.map((code) => ({
      label: code === 'zh-CN' ? '中文' : code === 'en' ? 'English' : code,
      value: code,
    })),
  )

  const naiveLocale = computed(() => getNaiveLocale(locale.value))
  const naiveDateLocale = computed(() => getNaiveDateLocale(locale.value))

  const setLocale: RuntimeLocaleContext['setLocale'] = (next) => {
    if (availableLocales.includes(next)) {
      locale.value = next
    }
  }

  const ctx: RuntimeLocaleContext = {
    locale,
    setLocale,
    availableLocales: availableLocalesRef,
    localeFallback: localeFallbackRef,
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
    availableLocales: computed(() => [
      { label: '中文', value: 'zh-CN' },
      { label: 'English', value: 'en' },
    ]),
    localeFallback: ref('zh-CN'),
    naiveLocale: computed(() => getNaiveLocale(fallbackLocale.value)),
    naiveDateLocale: computed(() => getNaiveDateLocale(fallbackLocale.value)),
  })
}
