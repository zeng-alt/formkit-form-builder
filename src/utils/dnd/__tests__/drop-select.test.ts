// ═══ L6：放下后自动选中——判定函数单测（拖放集成在 happy-dom 里难以真实模拟，
// 按规格改测「提交后选中」这一步的纯函数） ═══════════════════════════════════
import { describe, expect, it } from 'vitest'
import { resolveDropSelectionKey } from '@/utils/dnd/drop-select'

describe('resolveDropSelectionKey', () => {
  it('从面板拖入且只插入一个新元素 → 返回它的 __key', () => {
    expect(resolveDropSelectionKey(true, [{ __key: 'k1' }])).toBe('k1')
  })

  it('画布内移动（非面板来源）→ 不自动选中', () => {
    expect(resolveDropSelectionKey(false, [{ __key: 'k1' }])).toBeUndefined()
  })

  it('一次插入多个元素 → 不自动选中（避免歧义）', () => {
    expect(resolveDropSelectionKey(true, [{ __key: 'k1' }, { __key: 'k2' }])).toBeUndefined()
  })

  it('没有有效 __key → 不自动选中', () => {
    expect(resolveDropSelectionKey(true, [{}])).toBeUndefined()
    expect(resolveDropSelectionKey(true, [{ __key: 123 as unknown as string }])).toBeUndefined()
  })

  it('空插入 → 不自动选中', () => {
    expect(resolveDropSelectionKey(true, [])).toBeUndefined()
  })
})
