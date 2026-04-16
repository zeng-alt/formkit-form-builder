import { createI18n } from 'vue-i18n'
import { computed, type ComputedRef } from 'vue'
import { messages as defaultMessages } from './messages'

type AnyMessages = Record<string, any>

function mergeMessages(base: AnyMessages, overrides: AnyMessages) {
  const out: AnyMessages = { ...base }
  for (const locale of Object.keys(overrides)) {
    out[locale] = { ...(base[locale] ?? {}), ...(overrides[locale] ?? {}) }
  }
  return out
}

export function createFormBuilderI18n(options: {
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

  return i18n
}
