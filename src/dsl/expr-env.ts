// ═══ 表达式运行时环境：语言 → 时区 ══════════════════════════════════════════════
// 叶子模块：不 import vue、不 import 任何业务代码，供 expr-builtins（today()）与
// i18n 层（runtime-locale）双向引用而不产生环。
//
// 已知限制：locale 是模块级全局状态。同一页面内存在多个语言不同的 FormBuilder
// 实例时，today() 的时区会共享"最后一次 setExprLocale 的调用"，而非按各自实例
// 隔离——这是当前 expr-builtins 为纯函数、无 per-实例上下文的必然取舍。

/** 语言 → IANA 时区。en 故意不映射（英语无单一时区），回落浏览器本地时区 */
export const LOCALE_TIME_ZONES: Record<string, string> = {
  'zh-CN': 'Asia/Shanghai',
  'zh-TW': 'Asia/Taipei',
  'zh-HK': 'Asia/Hong_Kong',
  ja: 'Asia/Tokyo',
  ko: 'Asia/Seoul',
}

/** locale → 时区：精确匹配 → 按语言前缀匹配（'zh' / 'zh-SG' → 首个以 'zh' 开头的 key）→ undefined */
export function resolveTimeZoneForLocale(locale?: string): string | undefined {
  if (!locale) return undefined
  const exact = LOCALE_TIME_ZONES[locale]
  if (exact) return exact
  const prefix = locale.split('-')[0]
  if (!prefix) return undefined
  const key = Object.keys(LOCALE_TIME_ZONES).find((k) => k.startsWith(prefix))
  return key ? LOCALE_TIME_ZONES[key] : undefined
}

// 默认 'zh-CN'：与库默认语言一致，未接线 i18n 的纯 DSL 消费方（如后端/单测）行为不变
let currentLocale = 'zh-CN'

/** 设置表达式求值使用的语言（模块级状态，见文件头限制说明） */
export function setExprLocale(locale: string): void {
  if (typeof locale === 'string' && locale) currentLocale = locale
}

export function getExprLocale(): string {
  return currentLocale
}

/** 当前语言对应的 IANA 时区；无映射（如 en）时返回 undefined，交由调用方回落本地时区 */
export function getExprTimeZone(): string | undefined {
  return resolveTimeZoneForLocale(currentLocale)
}

/** 按指定时区（缺省本地时区）格式化为 yyyy-MM-dd；非法 timeZone 不抛错，回退本地时区重算 */
export function formatIsoDate(date: Date, timeZone?: string): string {
  const partsOf = (tz?: string) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      ...(tz ? { timeZone: tz } : {}),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const map: Record<string, string> = {}
    for (const p of parts) map[p.type] = p.value
    return `${map.year}-${map.month}-${map.day}`
  }
  try {
    return partsOf(timeZone)
  } catch {
    // timeZone 非法（RangeError）：回退本地时区，保证 today() 永不抛错
    return partsOf(undefined)
  }
}
