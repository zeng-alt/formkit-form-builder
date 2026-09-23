// ═══ lookupFieldValue：按字段名在表单数据里查找 ═══════════════════════════════════
import { describe, it, expect } from 'vitest'
import { lookupFieldValue } from '../form-data'

describe('lookupFieldValue', () => {
  it('根层命中：直接返回，不递归', () => {
    const data = { flag: 'yes', nested: { flag: 'no' } }
    expect(lookupFieldValue(data, 'flag')).toBe('yes')
  })

  it('嵌套命中：容器（group）内的字段能按名字找到', () => {
    const data = { card1: { price: 5 } }
    expect(lookupFieldValue(data, 'price')).toBe(5)
  })

  it('多层嵌套命中：group 套 group', () => {
    const data = { outer: { inner: { price: 5 } } }
    expect(lookupFieldValue(data, 'price')).toBe(5)
  })

  it('数组内命中：list 容器的每条记录都要进去找', () => {
    const data = { items: [{ sku: 'a' }, { sku: 'b', price: 9 }] }
    expect(lookupFieldValue(data, 'price')).toBe(9)
  })

  it('数组套对象套数组：多层混合结构也能找到', () => {
    const data = { rows: [{ cells: [{ value: 1 }, { value: 2, target: 42 }] }] }
    expect(lookupFieldValue(data, 'target')).toBe(42)
  })

  it('深度上限：超过 maxDepth 的字段应该找不到（返回 undefined）', () => {
    // 构造一条深度为 maxDepth+2 的链，字段挂在链尾
    let data: Record<string, unknown> = { deep: 'value' }
    for (let i = 0; i < 12; i++) {
      data = { wrap: data }
    }
    expect(lookupFieldValue(data, 'deep', 10)).toBeUndefined()
  })

  it('深度未超限时能找到', () => {
    let data: Record<string, unknown> = { deep: 'value' }
    for (let i = 0; i < 3; i++) {
      data = { wrap: data }
    }
    expect(lookupFieldValue(data, 'deep', 10)).toBe('value')
  })

  it('不存在的字段返回 undefined', () => {
    const data = { card1: { price: 5 } }
    expect(lookupFieldValue(data, 'notExist')).toBeUndefined()
  })

  it('重名（跨容器同名字段）：取深度优先遍历到的第一个命中', () => {
    const data = { cardA: { dup: 'A' }, cardB: { dup: 'B' } }
    // Object.keys 顺序即插入顺序：cardA 先于 cardB，取 cardA 的值
    expect(lookupFieldValue(data, 'dup')).toBe('A')
  })

  it('不进入 Date：不会把 Date 实例内部当成表单分组递归', () => {
    const data = { createdAt: new Date('2024-01-01') }
    expect(lookupFieldValue(data, 'getTime')).toBeUndefined()
  })

  it('不进入 Map / Set：同样不递归它们的内部结构', () => {
    const data = { tags: new Set(['a', 'b']), lookup: new Map([['k', 'v']]) }
    expect(lookupFieldValue(data, 'size')).toBeUndefined()
  })

  it('根层命中优先于嵌套命中（即使嵌套里也有同名字段）', () => {
    const data = { price: 1, card1: { price: 2 } }
    expect(lookupFieldValue(data, 'price')).toBe(1)
  })

  it('缓存不返回脏值：命中路径后，数据变化仍应读到最新值', () => {
    const data: Record<string, unknown> = { card1: { price: 5 } }
    expect(lookupFieldValue(data, 'price')).toBe(5)
    ;(data.card1 as Record<string, unknown>).price = 8
    expect(lookupFieldValue(data, 'price')).toBe(8)
  })
})

// ─── 未命中不缓存 ─────────────────────────────────────────────────────────────
// 负缓存无法自我校验：若把"不存在"记下来，同一个根对象上字段之后出现在嵌套层里时
// 会被永远读成 undefined 且不报错。这两条锁住"未命中不缓存"这一性质。
describe('lookupFieldValue：未命中不缓存', () => {
  it('同一根对象上，字段稍后出现在嵌套层里仍能找到', () => {
    const data: Record<string, unknown> = { group: {} }
    expect(lookupFieldValue(data, 'late')).toBeUndefined()
    ;(data.group as Record<string, unknown>).late = 42
    expect(lookupFieldValue(data, 'late')).toBe(42)
  })

  it('Vue 响应式内部标记（__v_ 前缀）直接短路，不当作字段查找', () => {
    // 即便嵌套层里真有同名键也不会被读到：__v_ 是 Vue 保留前缀，不可能是表单字段
    const data = { group: { __v_isRef: true } }
    expect(lookupFieldValue(data, '__v_isRef')).toBeUndefined()
  })
})
