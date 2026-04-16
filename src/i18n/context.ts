import { computed, inject, provide, type ComputedRef } from 'vue'
import { messages as defaultMessages } from './messages'

type AnyMessages = Record<string, any>

type I18nContext = {
  locale: ComputedRef<string>
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18N_KEY = Symbol('FormBuilderI18n')

function mergeMessages(base: AnyMessages, overrides: AnyMessages) {
  const out: AnyMessages = { ...base }
  for (const locale of Object.keys(overrides)) {
    const baseLocale = base[locale] ?? {}
    const overrideLocale = overrides[locale] ?? {}
    out[locale] = { ...baseLocale, ...overrideLocale }
  }
  return out
}

function getByPath(obj: AnyMessages, path: string) {
  const parts = path.split('.')
  let cur: any = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

function formatMessage(template: string, params?: Record<string, string | number>) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
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

  const t: I18nContext['t'] = (key, params) => {
    const current = getByPath(messages.value[locale.value] ?? {}, key)
    const fallback = getByPath(messages.value.en ?? {}, key)
    const raw = (current ?? fallback) as unknown
    if (typeof raw === 'string') return formatMessage(raw, params)
    return key
  }

  const ctx: I18nContext = { locale, t }
  provide(I18N_KEY, ctx)
  return ctx
}

export function useFormBuilderI18n() {
  return inject<I18nContext>(I18N_KEY, {
    locale: computed(() => 'zh-CN'),
    t: (key) => key,
  })
}

