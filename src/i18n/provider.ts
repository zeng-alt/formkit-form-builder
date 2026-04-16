import { createI18n, I18nInjectionKey } from 'vue-i18n'
import { computed, provide, type ComputedRef } from 'vue'
import { messages as defaultMessages } from './messages'

type AnyMessages = Record<string, any>

function mergeMessages(base: AnyMessages, overrides: AnyMessages) {
  const out: AnyMessages = { ...base }
  for (const locale of Object.keys(overrides)) {
    out[locale] = { ...(base[locale] ?? {}), ...(overrides[locale] ?? {}) }
  }
  return out
}

export function provideFormBuilderI18n(options: {
  locale: ComputedRef<string | undefined>
  messages?: ComputedRef<AnyMessages | undefined>
}) {
  const locale = computed(() => options.locale.value ?? 'zh-CN')
  const messages = computed(() => {
    const extra = options.messages?.value ?? {}
    return mergeMessages(defaultMessages as AnyMessages, extra)
  })

  const i18n = createI18n({
    legacy: false,
    locale: locale.value,
    messages: messages.value,
    fallbackLocale: 'en',
  })

  i18n.global.locale.value = locale.value
  provide(I18nInjectionKey, i18n)

  return i18n
}

