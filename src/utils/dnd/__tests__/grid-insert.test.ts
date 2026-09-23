// ═══ J3：拖放宽度规则（grid 容器）纯函数单测 ═══════════════════════════════════
import { describe, expect, it } from 'vitest'
import {
  computeGridInsert,
  computeGridInsertBadgeInfo,
  resolveGridInsertDirection,
} from '@/utils/dnd/grid-insert'
import { getColSpan } from '@/utils/dnd/grid'

function item(span: number, tag = '') {
  return { outerClass: `col-span-${span}`, __tag: tag }
}

describe('resolveGridInsertDirection', () => {
  it('横向：ascending 对应 right，非 ascending 对应 left', () => {
    expect(resolveGridInsertDirection(false, true)).toBe('right')
    expect(resolveGridInsertDirection(false, false)).toBe('left')
  })
  it('纵向：ascending 对应 bottom，非 ascending 对应 top', () => {
    expect(resolveGridInsertDirection(true, true)).toBe('bottom')
    expect(resolveGridInsertDirection(true, false)).toBe('top')
  })
})

describe('computeGridInsert：横向插入', () => {
  it('12 旁横插 → 6/6', () => {
    const siblings = [item(12)]
    const next = computeGridInsert(siblings, 0, 'right', [item(12, 'new')])
    expect(next).toHaveLength(2)
    expect(getColSpan(next[0])).toBe(6)
    expect(getColSpan(next[1])).toBe(6)
    expect(next[1].__tag).toBe('new')
  })

  it('6 旁横插（同行仅它自己）→ 新元素占满剩余的 6', () => {
    const siblings = [item(6)]
    const next = computeGridInsert(siblings, 0, 'right', [item(12, 'new')])
    expect(getColSpan(next[0])).toBe(6)
    expect(getColSpan(next[1])).toBe(6)
  })

  it('8 旁横插（同行仅它自己）→ 新元素占满剩余的 4', () => {
    const siblings = [item(8)]
    const next = computeGridInsert(siblings, 0, 'right', [item(12, 'new')])
    expect(getColSpan(next[0])).toBe(8)
    expect(getColSpan(next[1])).toBe(4)
  })

  it('行已满（6+6）横插 → 命中的 6 与新元素各 3', () => {
    const siblings = [item(6), item(6)]
    const next = computeGridInsert(siblings, 0, 'right', [item(12, 'new')])
    expect(next).toHaveLength(3)
    expect(getColSpan(next[0])).toBe(3) // 被拆分的 T
    expect(getColSpan(next[1])).toBe(3) // 新元素紧邻 T 右侧
    expect(getColSpan(next[2])).toBe(6) // 同行另一个元素不受影响
  })

  it('T=3 且所在行已满（3+3+3+3=12）→ 拆不开，新元素与 T 同宽 3', () => {
    const siblings = [item(3), item(3), item(3), item(3)]
    const next = computeGridInsert(siblings, 1, 'right', [item(12, 'new')])
    expect(getColSpan(next[1])).toBe(3) // T 不变
    expect(getColSpan(next[2])).toBe(3) // 新元素同宽，插到 T 右侧
    expect(next).toHaveLength(5)
  })

  it('横插 left：新元素插在 T 左侧', () => {
    const siblings = [item(6)]
    const next = computeGridInsert(siblings, 0, 'left', [item(12, 'new')])
    expect(next[0].__tag).toBe('new')
    expect(getColSpan(next[0])).toBe(6)
    expect(getColSpan(next[1])).toBe(6)
  })

  it('面板拖入（模板宽度 12）与画布内移动（已有宽度）同规则：只看 T 与所在行剩余空间', () => {
    const siblings = [item(6)]
    // 面板拖入：新元素模板宽度是 12
    const fromPalette = computeGridInsert(siblings, 0, 'right', [item(12)])
    // 画布内移动：被移动元素带着自己原来的宽度（比如 3）
    const fromCanvas = computeGridInsert(siblings, 0, 'right', [item(3)])
    expect(getColSpan(fromPalette[1])).toBe(6)
    expect(getColSpan(fromCanvas[1])).toBe(6)
  })
})

describe('computeGridInsert：纵向插入', () => {
  it('T 下方插入 → 宽度同 T、位于 T 所在行最后一个元素之后', () => {
    const siblings = [item(6), item(6), item(12)]
    // T 是下标 0（第一行两个 6 中的第一个），所在视觉行是 [0,1]
    const next = computeGridInsert(siblings, 0, 'bottom', [item(12, 'new')])
    expect(next).toHaveLength(4)
    expect(next[2].__tag).toBe('new')
    expect(getColSpan(next[2])).toBe(6)
    // 原第三个元素（col-span-12）被顶到下标 3
    expect(getColSpan(next[3])).toBe(12)
  })

  it('T 上方插入 → 宽度同 T、位于 T 所在行第一个元素之前', () => {
    const siblings = [item(6), item(6), item(12)]
    const next = computeGridInsert(siblings, 1, 'top', [item(12, 'new')])
    expect(next[0].__tag).toBe('new')
    expect(getColSpan(next[0])).toBe(6)
    expect(next[1].outerClass).toBe(siblings[0]!.outerClass)
  })

  it('T 不在行首/行尾时，位置仍按整行边界计算', () => {
    const siblings = [item(4), item(4), item(4), item(12)]
    // T 是下标 1（三个 4 组成的第一行中间那个）
    const bottom = computeGridInsert(siblings, 1, 'bottom', [item(12, 'new')])
    expect(bottom[3]!.__tag).toBe('new')
    expect(getColSpan(bottom[3])).toBe(4)
    expect(getColSpan(bottom[4])).toBe(12)

    const top = computeGridInsert(siblings, 1, 'top', [item(12, 'new')])
    expect(top[0]!.__tag).toBe('new')
    expect(getColSpan(top[0])).toBe(4)
  })
})

// ═══ L1：插入线旁的宽度徽标信息——覆盖上面 computeGridInsert 全部分支，并逐条
// 断言 badge 算出的宽度与"真的跑一遍 computeGridInsert 插入一个新元素"后量出来的
// 宽度完全一致（同一函数来源，不是照抄期望值）══════════════════════════════════
describe('computeGridInsertBadgeInfo：与 computeGridInsert 的真实结果保持一致', () => {
  function expectConsistentWithRealInsert(
    siblings: any[],
    targetIndex: number,
    direction: Parameters<typeof computeGridInsert>[2],
  ) {
    const info = computeGridInsertBadgeInfo(siblings, targetIndex, direction)
    const real = computeGridInsert(siblings, targetIndex, direction, [item(12, '__real_new__')])
    const insertedIdx = real.findIndex((n) => n.__tag === '__real_new__')
    const insertedWidth = getColSpan(real[insertedIdx])

    expect(info).not.toBeNull()
    if (!info) return
    if (info.kind === 'side') {
      expect(info.width).toBe(insertedWidth)
    } else if (info.kind === 'halve') {
      expect(info.width).toBe(insertedWidth)
    } else {
      expect(info.insertedWidth).toBe(insertedWidth)
    }
    return info
  }

  it('12 旁横插 → 平分 6 + 6', () => {
    const info = expectConsistentWithRealInsert([item(12)], 0, 'right')
    expect(info).toEqual({ kind: 'halve', width: 6 })
  })

  it('6 旁横插（同行仅它自己）→ 放在右侧 · 6/12', () => {
    const info = expectConsistentWithRealInsert([item(6)], 0, 'right')
    expect(info).toEqual({ kind: 'side', direction: 'right', width: 6 })
  })

  it('8 旁横插 → 放在右侧 · 4/12', () => {
    const info = expectConsistentWithRealInsert([item(8)], 0, 'right')
    expect(info).toEqual({ kind: 'side', direction: 'right', width: 4 })
  })

  it('行已满（6+6）横插 → 拆分为 3 + 3', () => {
    const info = expectConsistentWithRealInsert([item(6), item(6)], 0, 'right')
    expect(info).toEqual({ kind: 'split', targetWidth: 3, insertedWidth: 3 })
  })

  it('T=3 且所在行已满 → 拆不开，按普通「放在右侧」显示（与 T 同宽）', () => {
    const siblings = [item(3), item(3), item(3), item(3)]
    const info = expectConsistentWithRealInsert(siblings, 1, 'right')
    expect(info).toEqual({ kind: 'side', direction: 'right', width: 3 })
  })

  it('横插 left → 放在左侧 · 6/12', () => {
    const info = expectConsistentWithRealInsert([item(6)], 0, 'left')
    expect(info).toEqual({ kind: 'side', direction: 'left', width: 6 })
  })

  it('纵向插入 bottom → 放在下方 · 6/12（宽度同 T，不受同行其它元素影响）', () => {
    const siblings = [item(6), item(6), item(12)]
    const info = expectConsistentWithRealInsert(siblings, 0, 'bottom')
    expect(info).toEqual({ kind: 'side', direction: 'bottom', width: 6 })
  })

  it('纵向插入 top → 放在上方 · 6/12', () => {
    const siblings = [item(6), item(6), item(12)]
    const info = expectConsistentWithRealInsert(siblings, 1, 'top')
    expect(info).toEqual({ kind: 'side', direction: 'top', width: 6 })
  })

  it('目标下标越界 → 返回 null', () => {
    expect(computeGridInsertBadgeInfo([item(6)], 5, 'right')).toBeNull()
    expect(computeGridInsertBadgeInfo([], 0, 'right')).toBeNull()
  })
})
