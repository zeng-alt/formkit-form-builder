import { describe, expect, it } from 'vitest'
import { validationCount } from '@/utils/text'
import { schemaCondition } from '@/dsl'

describe('validationCount', () => {
  it('数组语法按规则数计数（顶层或 props 内）', () => {
    expect(validationCount({ validation: [['required'], ['min', 3]] })).toBe(2)
    expect(validationCount({ props: { validation: [['email']] } })).toBe(1)
    expect(validationCount({})).toBe(0)
  })

  it('条件必填的 { if, then, else } 按 then 分支计数', () => {
    const validation = schemaCondition('$a', [['min', 3], ['required']], [['min', 3]])
    expect(validationCount({ props: { validation } })).toBe(2)
  })
})
