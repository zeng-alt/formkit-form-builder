// ═══ structural-share：snapshotDeep 的可追踪性 + shareStructure 的共享性 ═══════════
// 覆盖规格 D2：
// 1. 追踪性——在 computed 里 snapshotDeep 一个 reactive 对象，改嵌套字段后 computed 重算；
// 2. 共享性——改一个叶子字段，兄弟子树的引用保持不变（toBe 旧引用），路径上的祖先
//    （被改字段本身及其容器）是新对象；
// 3. 完全相等时返回 prev 本身（同一引用）。
import { describe, expect, it } from 'vitest'
import { computed, nextTick, reactive } from 'vue'
import { shareStructure, snapshotDeep } from '@/utils/structural-share'

describe('snapshotDeep：可追踪性', () => {
  it('reactive 对象改嵌套字段后，用它的 computed 会重新求值', async () => {
    const state = reactive({ root: { children: [{ label: 'Old', n: 1 }] } })
    let evalCount = 0
    const snap = computed(() => {
      evalCount++
      return snapshotDeep(state)
    })

    expect(snap.value.root.children[0]!.label).toBe('Old')
    const countAfterFirstRead = evalCount

    state.root.children[0]!.label = 'New'
    await nextTick()

    expect(snap.value.root.children[0]!.label).toBe('New')
    expect(evalCount).toBeGreaterThan(countAfterFirstRead)
  })

  it('返回的是纯对象/数组，不是响应式代理', () => {
    const state = reactive({ a: 1, list: [1, 2, 3] })
    const snap = snapshotDeep(state)
    expect(Array.isArray(snap.list)).toBe(true)
    // 纯对象没有 Vue 响应式代理的内部标记
    expect((snap as any).__v_isReactive).toBeUndefined()
  })

  it('非 JSON 可表示的值（函数、Date）按原样引用，不递归拷贝', () => {
    const fn = () => 1
    const date = new Date()
    const state = { fn, date, nested: { ok: true } }
    const snap = snapshotDeep(state)
    expect(snap.fn).toBe(fn)
    expect(snap.date).toBe(date)
    expect(snap.nested).not.toBe(state.nested)
    expect(snap.nested).toEqual({ ok: true })
  })
})

describe('shareStructure：共享性', () => {
  it('改一个叶子字段：该字段与其容器祖先是新对象，兄弟子树 toBe 旧引用', () => {
    const prev = {
      root: {
        children: [
          { id: 'a', label: 'A' },
          {
            id: 'group',
            children: [
              { id: 'n1', label: 'N1' },
              { id: 'n2', label: 'N2' },
            ],
          },
        ],
      },
    }
    const next = {
      root: {
        children: [
          prev.root.children[0],
          {
            id: 'group',
            children: [{ id: 'n1', label: 'N1-changed' }, prev.root.children[1]!.children[1]],
          },
        ],
      },
    }

    const shared = shareStructure(prev, next)

    // 未改动的兄弟：字段 a、group 内未改的 n2
    expect(shared.root.children[0]).toBe(prev.root.children[0])
    const sharedGroup = shared.root.children[1] as any
    expect(sharedGroup.children[1]).toBe(prev.root.children[1]!.children[1])

    // 改动路径上的对象：新对象
    expect(sharedGroup).not.toBe(prev.root.children[1])
    expect(sharedGroup.children[0]).not.toBe(prev.root.children[1]!.children[0])
    expect(sharedGroup.children[0].label).toBe('N1-changed')
    expect(shared).not.toBe(prev)
    expect(shared.root).not.toBe(prev.root)
  })

  it('整棵深比较完全相等（不同引用、同结构）时返回 prev 本身', () => {
    const prev = {
      a: 1,
      list: [
        { id: 'x', v: 1 },
        { id: 'y', v: 2 },
      ],
    }
    const next = {
      a: 1,
      list: [
        { id: 'x', v: 1 },
        { id: 'y', v: 2 },
      ],
    }

    const shared = shareStructure(prev, next)
    expect(shared).toBe(prev)
  })

  it('数组长度变化（插入/删除）：改变的部分是新引用，未变的公共项复用旧引用', () => {
    const prev = { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
    const next = { items: [{ id: 'a' }, { id: 'new' }, { id: 'b' }, { id: 'c' }] }

    const shared = shareStructure(prev, next)
    expect(shared).not.toBe(prev)
    expect(shared.items[0]).toBe(prev.items[0])
    expect(shared.items[2]).not.toBe(prev.items[1]) // 位置错开，新对象也没关系
  })

  it('原始值不同：直接返回新值', () => {
    expect(shareStructure(1, 2)).toBe(2)
    expect(shareStructure('a', 'a')).toBe('a')
  })
})
