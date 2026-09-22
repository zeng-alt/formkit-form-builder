// ═══ resolveValidation ⇄ parseValidation：FormKit v2 数组语法往返 ══════════════
// 覆盖修饰符组合、含逗号/竖线参数（旧的 pipe 字符串格式在这里会被破坏，数组语法不会）、
// 多规则、空规则、带 message。

import { describe, it, expect } from 'vitest'
import { resolveValidation } from '@/dsl/compile'
import { parseValidation } from '@/dsl/convert'
import type { ValidationRule } from '@/types/dsl'

function roundTrip(rules: ValidationRule[] | undefined) {
  const resolved = resolveValidation(rules)
  const parsed = parseValidation(resolved.validation, resolved['validation-messages'])
  return { resolved, parsed }
}

describe('resolveValidation → 数组语法', () => {
  it('无规则：输出空数组 []（不是省略 key，也不是空字符串）', () => {
    expect(resolveValidation(undefined).validation).toEqual([])
    expect(resolveValidation([]).validation).toEqual([])
  })

  it('单规则无参：["required"]', () => {
    const { resolved } = roundTrip([{ rule: 'required' }])
    expect(resolved.validation).toEqual([['required']])
  })

  it('单规则带参：["length", 2, 10]（参数原样保留类型，不转成字符串）', () => {
    const { resolved } = roundTrip([{ rule: 'length', args: [2, 10] }])
    expect(resolved.validation).toEqual([['length', 2, 10]])
  })

  it('修饰符组合：(200)+*? 都拼在规则名前缀', () => {
    const rules: ValidationRule[] = [
      { rule: 'email', debounce: 200, empty: true, force: true, optional: true },
    ]
    const { resolved } = roundTrip(rules)
    expect(resolved.validation).toEqual([['(200)+*?email']])
  })
})

describe('resolveValidation ⇄ parseValidation round-trip', () => {
  it('含逗号参数的规则（matches 正则）无损往返', () => {
    const rules: ValidationRule[] = [{ rule: 'matches', args: ['/^a,b$/'] }]
    const { resolved, parsed } = roundTrip(rules)
    expect(resolved.validation).toEqual([['matches', '/^a,b$/']])
    expect(parsed).toEqual(rules)
  })

  it('含竖线参数的规则无损往返（旧 pipe 字符串格式会在这里被拆断，数组语法不会）', () => {
    const rules: ValidationRule[] = [{ rule: 'matches', args: ['/^a|b$/'] }]
    const { resolved, parsed } = roundTrip(rules)
    expect(resolved.validation).toEqual([['matches', '/^a|b$/']])
    expect(parsed).toEqual(rules)
  })

  it('同时含逗号和竖线的复杂参数，与其余规则共存，逐条无损往返', () => {
    const rules: ValidationRule[] = [
      { rule: 'required' },
      { rule: 'matches', args: ['/^[a,b|c]+$/'] },
      { rule: 'length', args: [2, 10] },
    ]
    const { parsed } = roundTrip(rules)
    expect(parsed).toEqual(rules)
  })

  it('多规则 + 修饰符 + 数字/布尔参数往返一致', () => {
    const rules: ValidationRule[] = [
      { rule: 'required' },
      { rule: 'min', args: [3] },
      { rule: 'confirm', optional: true, args: ['password'] },
      { rule: 'accepted', debounce: 100 },
    ]
    const { parsed } = roundTrip(rules)
    expect(parsed).toEqual(rules)
  })

  it('空规则往返为 undefined（parseValidation 对空数组返回 undefined）', () => {
    const { resolved, parsed } = roundTrip(undefined)
    expect(resolved.validation).toEqual([])
    expect(parsed).toBeUndefined()
  })

  it('带 message：validation-messages 以规则名为 key，往返还原', () => {
    const rules: ValidationRule[] = [
      { rule: 'required', message: '必填' },
      { rule: 'email', message: 'not a valid email' },
    ]
    const { resolved, parsed } = roundTrip(rules)
    expect(resolved['validation-messages']).toEqual({
      required: '必填',
      email: 'not a valid email',
    })
    expect(parsed).toEqual(rules)
  })

  it('同一规则出现两次时，message 以规则名索引——后者覆盖前者（FormKit 消息系统的固有限制）', () => {
    const rules: ValidationRule[] = [
      { rule: 'matches', args: ['/^a$/'], message: 'first' },
      { rule: 'matches', args: ['/^b$/'], message: 'second' },
    ]
    const resolved = resolveValidation(rules)
    expect(resolved['validation-messages']).toEqual({ matches: 'second' })
  })
})

describe('parseValidation：非数组输入', () => {
  it('非数组 / 空数组 / undefined 均返回 undefined（不再兼容旧的 pipe 字符串）', () => {
    expect(parseValidation(undefined)).toBeUndefined()
    expect(parseValidation('required|email')).toBeUndefined()
    expect(parseValidation([])).toBeUndefined()
    expect(parseValidation(null)).toBeUndefined()
  })
})
