import type { DslRules } from './types'

const escRegex = (raw: string) => raw.replaceAll('\\', '\\\\').replaceAll('/', '\\/')

export function compileValidation(rules: DslRules | undefined): string | undefined {
  if (!rules) return undefined
  const out: string[] = []

  if (rules.required) out.push('required')

  if (typeof rules.min === 'number' || typeof rules.max === 'number') {
    const min = typeof rules.min === 'number' ? String(rules.min) : ''
    const max = typeof rules.max === 'number' ? String(rules.max) : ''
    out.push(`length:${min},${max}`)
  }

  if (typeof rules.pattern === 'string' && rules.pattern.trim()) {
    out.push(`matches:/${escRegex(rules.pattern.trim())}/`)
  }

  return out.length ? out.join('|') : undefined
}

export function compileValidationMessages(
  rules: DslRules | undefined,
): Record<string, string> | undefined {
  const msg = rules?.message?.trim()
  if (!msg) return undefined
  const messages: Record<string, string> = {}
  if (rules?.required) messages.required = msg
  if (rules?.pattern) messages.matches = msg
  if (rules?.min !== undefined || rules?.max !== undefined) messages.length = msg
  return Object.keys(messages).length ? messages : undefined
}
