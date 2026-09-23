// ═══ L1：插入徽标文案格式化（纯字符串拼装，宽度计算已在 grid-insert.test.ts 覆盖）══
import { describe, expect, it } from 'vitest'
import { formatGridInsertBadge } from '@/utils/dnd/insert-badge'
import type { GridInsertBadgeInfo } from '@/utils/dnd/grid-insert'

// 桩翻译函数：直接把 key 和参数拼出来，断言时既能确认走了哪个 key，也能确认参数值
const t = (key: string, params?: Record<string, string | number>) =>
  `${key}${params ? `(${JSON.stringify(params)})` : ''}`

describe('formatGridInsertBadge', () => {
  it('side：按方向选 key，带 width 参数', () => {
    expect(formatGridInsertBadge({ kind: 'side', direction: 'right', width: 6 }, t)).toBe(
      'dnd.insertBadge.right({"width":6})',
    )
    expect(formatGridInsertBadge({ kind: 'side', direction: 'left', width: 4 }, t)).toBe(
      'dnd.insertBadge.left({"width":4})',
    )
    expect(formatGridInsertBadge({ kind: 'side', direction: 'top', width: 12 }, t)).toBe(
      'dnd.insertBadge.top({"width":12})',
    )
    expect(formatGridInsertBadge({ kind: 'side', direction: 'bottom', width: 8 }, t)).toBe(
      'dnd.insertBadge.bottom({"width":8})',
    )
  })

  it('split：a/b 分别是目标与新元素的宽度', () => {
    const info: GridInsertBadgeInfo = { kind: 'split', targetWidth: 3, insertedWidth: 3 }
    expect(formatGridInsertBadge(info, t)).toBe('dnd.insertBadge.split({"a":3,"b":3})')
  })

  it('halve：a/b 都是一半宽度', () => {
    const info: GridInsertBadgeInfo = { kind: 'halve', width: 6 }
    expect(formatGridInsertBadge(info, t)).toBe('dnd.insertBadge.halve({"a":6,"b":6})')
  })
})
