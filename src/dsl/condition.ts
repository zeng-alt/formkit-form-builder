import type { DslCondition, DslOperator } from './types'

const cmp = (op: DslOperator, left: unknown, right: unknown) => {
  if (op === 'eq') return left === right
  if (op === 'neq') return left !== right
  if (op === 'in') return Array.isArray(right) ? right.includes(left) : false
  if (op === 'nin') return Array.isArray(right) ? !right.includes(left) : true

  const ln = typeof left === 'number' ? left : Number(left)
  const rn = typeof right === 'number' ? right : Number(right)
  const bothNum = Number.isFinite(ln) && Number.isFinite(rn)
  const l = bothNum ? ln : String(left ?? '')
  const r = bothNum ? rn : String(right ?? '')

  if (op === 'gt') return l > r
  if (op === 'gte') return l >= r
  if (op === 'lt') return l < r
  if (op === 'lte') return l <= r
  return false
}

export function evalDslCondition(cond: DslCondition | undefined, data: Record<string, unknown>): boolean {
  if (!cond) return true
  if ('and' in cond) return cond.and.every((c) => evalDslCondition(c, data))
  if ('or' in cond) return cond.or.some((c) => evalDslCondition(c, data))
  if ('not' in cond) return !evalDslCondition(cond.not, data)
  return cmp(cond.operator, data[cond.field], cond.value)
}
