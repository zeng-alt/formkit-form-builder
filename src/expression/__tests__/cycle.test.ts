// ═══ findExprCycles：表达式依赖环的静态检测 ═══════════════════════════════════

import { describe, it, expect } from 'vitest'
import { findExprCycles, type ExprBinding } from '@/expression/runtime'
import type { CompiledExpr } from '@/expression/evaluator'

// 测试只关心 name / compiled.deps，evaluate/ast 用不到，给个哑实现即可
function binding(name: string, deps: string[]): ExprBinding {
  const compiled: CompiledExpr = {
    ast: { type: 'literal', value: null },
    deps,
    evaluate: () => undefined,
  }
  return { name, compiled }
}

describe('findExprCycles', () => {
  it('自环：A 依赖自身', () => {
    const { cyclicNames, cycles } = findExprCycles([binding('a', ['a'])])
    expect(cyclicNames).toEqual(new Set(['a']))
    expect(cycles).toEqual([['a', 'a']])
  })

  it('两节点环：A → B → A', () => {
    const bindings = [binding('a', ['b']), binding('b', ['a'])]
    const { cyclicNames, cycles } = findExprCycles(bindings)
    expect(cyclicNames).toEqual(new Set(['a', 'b']))
    expect(cycles).toHaveLength(1)
    expect(cycles[0]).toEqual(['a', 'b', 'a'])
  })

  it('三节点环：A → B → C → A', () => {
    const bindings = [binding('a', ['b']), binding('b', ['c']), binding('c', ['a'])]
    const { cyclicNames, cycles } = findExprCycles(bindings)
    expect(cyclicNames).toEqual(new Set(['a', 'b', 'c']))
    expect(cycles).toHaveLength(1)
    expect(cycles[0]).toEqual(['a', 'b', 'c', 'a'])
  })

  it('无环：链式依赖 A → B → C', () => {
    const bindings = [binding('a', ['b']), binding('b', ['c']), binding('c', [])]
    const { cyclicNames, cycles } = findExprCycles(bindings)
    expect(cyclicNames.size).toBe(0)
    expect(cycles).toEqual([])
  })

  it('依赖非表达式字段不算环：A 依赖普通输入字段 x（x 不在 bindings 里）', () => {
    const bindings = [binding('a', ['x'])]
    const { cyclicNames, cycles } = findExprCycles(bindings)
    expect(cyclicNames.size).toBe(0)
    expect(cycles).toEqual([])
  })

  it('多个不相交环：{a↔b} 与 {c↔d} 互不影响，且都被找到', () => {
    const bindings = [
      binding('a', ['b']),
      binding('b', ['a']),
      binding('c', ['d']),
      binding('d', ['c']),
      binding('e', []), // 普通独立表达式字段，不受影响
    ]
    const { cyclicNames, cycles } = findExprCycles(bindings)
    expect(cyclicNames).toEqual(new Set(['a', 'b', 'c', 'd']))
    expect(cycles).toHaveLength(2)
  })
})
