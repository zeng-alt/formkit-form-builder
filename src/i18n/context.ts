import { computed, inject, provide, type ComputedRef } from 'vue'
import defaultMessages from './messages'

type AnyMessages = Record<string, any>

type I18nContext = {
  locale: ComputedRef<string>
  localeFallback: ComputedRef<string>
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18N_KEY = Symbol('FormBuilderI18n')

function isObject(item: any): boolean {
  return item !== null && typeof item === 'object' && !Array.isArray(item)
}

// 递归深合并（对齐 camunda7-ui 的国际化语义）：
// 后传的 messages 逐 key 覆写前面的，未覆写的沿用原值；数组整体替换。
function deepMerge(target: any, ...sources: any[]): any {
  if (!sources.length) return target
  const source = sources.shift()
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key]) && isObject(target[key])) {
        deepMerge(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
  }
  return deepMerge(target, ...sources)
}

function mergeMessages(base: AnyMessages, overrides: AnyMessages) {
  const out: AnyMessages = {}
  for (const locale of Object.keys(base)) {
    out[locale] = deepMerge({}, base[locale])
  }
  for (const locale of Object.keys(overrides)) {
    out[locale] = deepMerge(out[locale] ?? {}, overrides[locale] ?? {})
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
  localeFallback?: ComputedRef<string | undefined>
  messages?: ComputedRef<AnyMessages | undefined>
}) {
  const locale = computed(() => options.locale.value ?? options.localeFallback?.value ?? 'zh-CN')
  const localeFallback = computed(() => options.localeFallback?.value ?? 'zh-CN')
  const messages = computed(() => {
    const extra = options.messages?.value ?? {}
    return mergeMessages(defaultMessages as AnyMessages, extra)
  })

  const t: I18nContext['t'] = (key, params) => {
    const current = getByPath(messages.value[locale.value] ?? {}, key)
    const fallbackLocale = getByPath(messages.value[localeFallback.value] ?? {}, key)
    const fallbackEn = getByPath(messages.value.en ?? {}, key)
    const raw = (current ?? fallbackLocale ?? fallbackEn) as unknown
    if (typeof raw === 'string') return formatMessage(raw, params)
    return key
  }

  const ctx: I18nContext = { locale, localeFallback, t }
  provide(I18N_KEY, ctx)
  return ctx
}

export function useFormBuilderI18n() {
  return inject<I18nContext>(I18N_KEY, {
    locale: computed(() => 'zh-CN'),
    localeFallback: computed(() => 'zh-CN'),
    // 无 provider（如 FormRenderer 单独使用未传 config、外层无 BuilderProvider）时，
    // 仍按内置默认文案（zh-CN → en）解析，而不是原样返回 key
    t: (key, params) => {
      const zh = getByPath(defaultMessages['zh-CN'] ?? {}, key)
      const en = getByPath(defaultMessages.en ?? {}, key)
      const raw = (zh ?? en) as unknown
      if (typeof raw === 'string') return formatMessage(raw, params)
      return key
    },
  })
}
