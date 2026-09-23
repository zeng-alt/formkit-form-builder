// ═══ K1：调宽把手纯逻辑单测 ═══════════════════════════════════════════════════
// 覆盖 use-grid-span-resize.ts 里不依赖 DOM 的纯函数：位移换算取整、上下限钳制、
// 撞限判定，以及"撞限反馈只触发一次"的边沿检测器。组件层（键盘 ←/→、双击恢复、
// aria 值、body 光标/选区恢复）见 src/builder/__tests__ 下的挂载测试。
import { describe, expect, it } from 'vitest'
import {
  clampSpan,
  computeSpanFromDelta,
  createLimitPulseTracker,
  detectLimitHit,
} from '../use-grid-span-resize'

describe('computeSpanFromDelta：位移换算 + 取整', () => {
  it('按列宽换算并四舍五入到整列', () => {
    expect(computeSpanFromDelta(6, 0, 40)).toBe(6)
    expect(computeSpanFromDelta(6, 39, 40)).toBe(7) // 0.975 列 → 四舍五入到 1
    expect(computeSpanFromDelta(6, 19, 40)).toBe(6) // 0.475 列 → 四舍五入到 0
    expect(computeSpanFromDelta(6, -80, 40)).toBe(4)
  })

  it('列宽为 0（容器尚未测量）时原样返回起始 span，不做除零运算', () => {
    expect(computeSpanFromDelta(6, 100, 0)).toBe(6)
  })
})

describe('clampSpan：钳制到 [2, max]', () => {
  it('默认上限 12', () => {
    expect(clampSpan(1)).toBe(2)
    expect(clampSpan(2)).toBe(2)
    expect(clampSpan(7.4)).toBe(7)
    expect(clampSpan(7.5)).toBe(8)
    expect(clampSpan(20)).toBe(12)
  })

  it('自定义上限（输入组 maxSpanFor 场景）', () => {
    expect(clampSpan(10, 5)).toBe(5)
    expect(clampSpan(1, 5)).toBe(2)
    expect(clampSpan(3, 5)).toBe(3)
  })

  it('上限本身低于 2 时仍保底钳到 2（不会出现负宽度/0 宽度）', () => {
    expect(clampSpan(5, 1)).toBe(2)
  })
})

describe('detectLimitHit：撞限判定（用钳制前的目标值，不是钳制后的值）', () => {
  it('目标值触底 → min', () => {
    expect(detectLimitHit(2)).toBe('min')
    expect(detectLimitHit(1)).toBe('min')
    expect(detectLimitHit(-3)).toBe('min')
  })

  it('目标值触顶 → max', () => {
    expect(detectLimitHit(12)).toBe('max')
    expect(detectLimitHit(20)).toBe('max')
    expect(detectLimitHit(6, 6)).toBe('max')
  })

  it('区间内 → null', () => {
    expect(detectLimitHit(3)).toBeNull()
    expect(detectLimitHit(11)).toBeNull()
  })
})

describe('createLimitPulseTracker：撞限反馈只触发一次，不连续抖', () => {
  it('持续停在同一个限位：pulse 计数只增加一次', () => {
    const tracker = createLimitPulseTracker()
    expect(tracker.update(null)).toBe(0)
    expect(tracker.update('max')).toBe(1)
    expect(tracker.update('max')).toBe(1) // 还在 max，不再触发
    expect(tracker.update('max')).toBe(1)
  })

  it('离开限位后回到区间内，再次撞同一个限位：算作新的一次撞限', () => {
    const tracker = createLimitPulseTracker()
    expect(tracker.update('max')).toBe(1)
    expect(tracker.update(null)).toBe(1) // 拖回区间内，pulse 不变
    expect(tracker.update('max')).toBe(2) // 再次撞限，pulse+1
  })

  it('从一个限位直接切到另一个限位（min → max）：也算新的一次撞限', () => {
    const tracker = createLimitPulseTracker()
    expect(tracker.update('min')).toBe(1)
    expect(tracker.update('max')).toBe(2)
  })

  it('reset 后视为全新会话，下一次撞限重新从 1 开始计数变化', () => {
    const tracker = createLimitPulseTracker()
    tracker.update('max')
    tracker.update('max')
    tracker.reset()
    expect(tracker.update('max')).toBe(2) // pulse 是累计值不会清零，但 reset 后这一下确实是"新的一次"
  })
})
