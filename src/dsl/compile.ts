// ═══ DSL → FormKit 表达式字符串编译 ════════════════════════════════════════════

import type { Expr, EventBinding, ValidationRule } from '../types/dsl'
import { getBuiltin } from './expr-builtins'

export type FieldRefMode = 'formData' | 'var'

/**
 * 编译表达式 AST 为 JS 表达式字符串。
 * - var 模式（默认）：字段引用编译为 `$name`。FormKit v2 schema 表达式把 `$name` 解析到
 *   FormKitSchema 的 data 上（表单数据），`if` 与计算值都用它；`$formData.` 前缀不是
 *   FormKit 表达式变量，解析恒为 undefined，因此不再使用 formData 模式。
 */
export function exprToJs(expr: Expr, mode: FieldRefMode = 'var'): string {
  switch (expr.type) {
    case 'literal':
      return expr.value === undefined ? 'undefined' : JSON.stringify(expr.value)
    case 'field':
      return mode === 'formData' ? `$formData.${expr.name}` : `$${expr.name}`
    case 'call': {
      if (expr.fn === '__raw__') {
        const raw = expr.args[0]
        if (raw && raw.type === 'literal' && typeof raw.value === 'string') return raw.value
      }
      const builtin = getBuiltin(expr.fn)
      const argJs = expr.args.map((a) => exprToJs(a, mode))
      if (builtin) return builtin.toJs(argJs)
      // 未知函数：以调用形式兜底输出
      return `${expr.fn}(${argJs.join(', ')})`
    }
  }
}

// ─── 校验 ──────────────────────────────────────────────────────────────────────

function resolveModifiers(m: ValidationRule | undefined): string {
  if (!m) return ''
  let prefix = ''
  if (m.debounce) prefix += `(${m.debounce})`
  if (m.empty) prefix += '+'
  if (m.force) prefix += '*'
  if (m.optional) prefix += '?'
  return prefix
}

export interface ResolvedValidation {
  validation?: string
  'validation-messages'?: Record<string, string>
}

export function resolveValidation(rules: ValidationRule[] | undefined): ResolvedValidation {
  if (!rules?.length) return {}

  const validationStr = rules
    .map((v) => {
      const prefix = resolveModifiers(v)
      const args = v.args?.length ? `:${v.args.join(',')}` : ''
      return `${prefix}${v.rule}${args}`
    })
    .join('|')

  const messages = rules
    .filter((v) => v.message)
    .reduce<Record<string, string>>((acc, v) => {
      acc[v.rule] = v.message!
      return acc
    }, {})

  return {
    validation: validationStr,
    ...(Object.keys(messages).length ? { 'validation-messages': messages } : {}),
  }
}

// ─── 事件 ──────────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function resolveEvents(events: EventBinding[] | undefined): Record<string, string> {
  if (!events?.length) return {}

  return events.reduce<Record<string, string>>((acc, binding) => {
    const key = `on${capitalize(binding.event)}`
    acc[key] = `($event) => { ${binding.handler} }`
    return acc
  }, {})
}
