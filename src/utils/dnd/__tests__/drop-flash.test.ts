// ═══ L6：放下后的高亮闪烁计数表 ══════════════════════════════════════════════
import { describe, expect, it } from 'vitest'
import { dropFlashState, triggerDropFlash } from '@/utils/dnd/drop-flash'

describe('triggerDropFlash', () => {
  it('给出的 key 各自计数 +1', () => {
    triggerDropFlash(['a', 'b'])
    expect(dropFlashState.a).toBe(1)
    expect(dropFlashState.b).toBe(1)
    triggerDropFlash(['a'])
    expect(dropFlashState.a).toBe(2)
    expect(dropFlashState.b).toBe(1)
  })

  it('忽略空 / 非字符串 key，不抛错', () => {
    expect(() => triggerDropFlash([undefined, null, ''])).not.toThrow()
  })
})
