import type { DslRules } from './types'

const escRegex = (raw: string) => raw.replaceAll('\\', '\\\\').replaceAll('/', '\\/')

export function compileValidation(rules: DslRules | undefined): string | undefined {
  if (!rules) return undefined
  if (typeof rules.validation === 'string' && rules.validation.trim()) return rules.validation.trim()
  const out: string[] = []

  if (rules.required) out.push('required')

  if (rules.email) out.push('email')
  if (rules.number) out.push('number')
  if (rules.url) out.push('url')
  if (rules.alphanumeric) out.push('alphanumeric')
  if (rules.contains_alphanumeric) out.push('contains_alphanumeric')
  if (rules.contains_numeric) out.push('contains_numeric')

  if (typeof rules.min === 'number') out.push(`min:${rules.min}`)
  if (typeof rules.max === 'number') out.push(`max:${rules.max}`)

  if (rules.between && typeof rules.between.min === 'number' && typeof rules.between.max === 'number') {
    out.push(`between:${rules.between.min},${rules.between.max}`)
  }

  if (rules.length && (typeof rules.length.min === 'number' || typeof rules.length.max === 'number')) {
    const min = typeof rules.length.min === 'number' ? String(rules.length.min) : ''
    const max = typeof rules.length.max === 'number' ? String(rules.length.max) : ''
    out.push(`length:${min},${max}`)
  }

  const matches = typeof rules.matches === 'string' ? rules.matches : rules.pattern
  if (typeof matches === 'string' && matches.trim()) {
    out.push(`matches:/${escRegex(matches.trim())}/`)
  }

  return out.length ? out.join('|') : undefined
}

export function compileValidationMessages(
  rules: DslRules | undefined,
): Record<string, string> | undefined {
  const explicit = rules?.validationMessages
  if (explicit && typeof explicit === 'object' && Object.keys(explicit).length) {
    return explicit
  }
  const messages: Record<string, string> = {}
  const globalMsg = rules?.message?.trim() || undefined
  const overrides = rules?.messages && typeof rules.messages === 'object' ? rules.messages : undefined

  const set = (ruleName: string) => {
    const specific = overrides?.[ruleName]?.trim()
    const msg = specific || globalMsg
    if (msg) messages[ruleName] = msg
  }

  if (rules?.required) set('required')
  if (rules?.email) set('email')
  if (rules?.number) set('number')
  if (rules?.url) set('url')
  if (rules?.alphanumeric) set('alphanumeric')
  if (rules?.contains_alphanumeric) set('contains_alphanumeric')
  if (rules?.contains_numeric) set('contains_numeric')
  if (typeof rules?.min === 'number') set('min')
  if (typeof rules?.max === 'number') set('max')
  if (rules?.between) set('between')
  if (rules?.length) set('length')
  if (rules?.matches || rules?.pattern) set('matches')

  return Object.keys(messages).length ? messages : undefined
}
