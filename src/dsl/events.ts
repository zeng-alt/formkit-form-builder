// ═══ 事件绑定：DSL events ⇄ schema __bind ══════════════════════════════════════
// DSL 的 events 是唯一真源；schema 侧的表示统一收敛为 __bind: { onClick: handler }。
// bindKeyOf 是这一方向（DSL → schema）拼 key 的唯一来源，避免各处各自拼 'on' + capitalize。

import { FORM_EVENTS, type EventBinding, type FormEvent } from '../types/dsl'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** 'click' → 'onClick' */
export function bindKeyOf(event: FormEvent): string {
  return `on${capitalize(event)}`
}

/** 可绑定事件对应的 schema __bind key 全集（单一来源，供 bind-runtime / BindEditor 消费） */
export const BIND_EVENT_KEYS: ReadonlySet<string> = new Set(FORM_EVENTS.map(bindKeyOf))

/** DSL events → schema __bind；空/全空白返回 undefined，保证不写出空对象 */
export function eventsToBind(events?: EventBinding[]): Record<string, string> | undefined {
  if (!events?.length) return undefined
  const out: Record<string, string> = {}
  for (const { event, handler } of events) {
    if (typeof handler !== 'string' || !handler.trim()) continue
    out[bindKeyOf(event)] = handler
  }
  return Object.keys(out).length ? out : undefined
}

function extractCode(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && typeof (v as { __js?: unknown }).__js === 'string') {
    return (v as { __js: string }).__js
  }
  return undefined
}

/** schema __bind → DSL events；非 BIND_EVENT_KEYS 的键忽略，空白代码跳过，按 FORM_EVENTS 顺序输出 */
export function bindToEvents(bind: unknown): EventBinding[] | undefined {
  if (!bind || typeof bind !== 'object') return undefined
  const obj = bind as Record<string, unknown>
  const map = new Map<FormEvent, string>()
  for (const event of FORM_EVENTS) {
    const key = bindKeyOf(event)
    if (!(key in obj)) continue
    const code = extractCode(obj[key])
    if (typeof code === 'string' && code.trim()) map.set(event, code)
  }
  if (!map.size) return undefined
  return FORM_EVENTS.filter((e) => map.has(e)).map((event) => ({ event, handler: map.get(event)! }))
}
