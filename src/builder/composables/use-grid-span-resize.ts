import { onUnmounted, ref, type Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { getColSpan as parseColSpan } from '@/utils/dnd/grid'

// 栅格上下限：与 utils/dnd/grid.ts 的 clampColSpan 保持一致（下限 2，避免元素过窄；
// 上限 12，一整行）。这里单独复制一份常量而不是导出内部的 clampColSpan，
// 因为这里还需要一个"未钳制前的目标值是否已经越界"的中间态（撞限判定），
// clampColSpan 只返回钳制后的最终值，判断不出"越界了多少/是否越界"。
const MIN_SPAN = 2
const MAX_SPAN = 12

function withColSpanClass(field: FormKitSchemaFormKit, span: number) {
  const safeSpan = Math.max(MIN_SPAN, Math.min(MAX_SPAN, Math.round(span)))
  const currentOuterClass = typeof field.outerClass === 'string' ? field.outerClass : ''
  let classes = currentOuterClass
  if (/\bcol-span-\d+\b/.test(classes)) {
    classes = classes
      .replace(/\bcol-span-\d+\b/g, `col-span-${safeSpan}`)
      .replace(/\s+/g, ' ')
      .trim()
  } else {
    classes = `${classes} col-span-${safeSpan}`.replace(/\s+/g, ' ').trim()
  }
  return { ...field, outerClass: classes || undefined }
}

/** 纯函数：根据鼠标水平位移与列宽换算目标 span（未钳制），四舍五入取整列。 */
export function computeSpanFromDelta(
  startSpan: number,
  deltaX: number,
  columnWidth: number,
): number {
  if (!columnWidth) return startSpan
  return startSpan + Math.round(deltaX / columnWidth)
}

/** 纯函数：把目标 span 钳制到 [2, max] 区间（max 默认 12，输入组场景传更小的值）。 */
export function clampSpan(span: number, max: number = MAX_SPAN): number {
  const safeMax = Math.max(MIN_SPAN, Math.min(MAX_SPAN, max))
  return Math.max(MIN_SPAN, Math.min(safeMax, Math.round(span)))
}

/** 纯函数：钳制前的目标值是否已经越过上/下限（用于撞限反馈，不影响实际写入的 span）。 */
export function detectLimitHit(
  requestedSpan: number,
  max: number = MAX_SPAN,
): 'min' | 'max' | null {
  if (requestedSpan <= MIN_SPAN) return 'min'
  if (requestedSpan >= max) return 'max'
  return null
}

/**
 * 撞限"只触发一次"的边沿检测器：同一次撞限（min/max 保持不变）期间反复调用只在
 * 第一次触发时的返回值变化，之后返回相同的 pulse 计数，直到 update(null) 之后再次
 * 撞限才会 pulse+1——用计数而不是布尔值，方便调用方拿它当 :key 强制重新播放一次性
 * 抖动动画（同一个布尔值 true→true 不会触发过渡/动画重放，计数值变化才会）。
 */
export function createLimitPulseTracker() {
  let last: 'min' | 'max' | null = null
  let pulses = 0
  return {
    update(hit: 'min' | 'max' | null): number {
      if (hit && hit !== last) pulses += 1
      last = hit
      return pulses
    },
    reset() {
      last = null
    },
  }
}

export function useGridSpanResize(params: {
  items: Ref<FormKitSchemaFormKit[]>
  containerRef: Ref<unknown>
  onResizeEnd: () => void
  /** 当前项的 span 上限（返回 -1 或忽略则不限）。输入组用于保证总宽 ≤ 12 */
  maxSpanFor?: (index: number, items: FormKitSchemaFormKit[]) => number
}) {
  const resizingIndex = ref<number | null>(null)
  const resizingPointerId = ref<number | null>(null)
  const startX = ref(0)
  const startSpan = ref(12)
  const columnWidth = ref(0)
  /** 拖动中跟随鼠标显示数值气泡用（viewport 坐标，气泡按 position:fixed 定位） */
  const pointerPosition = ref<{ x: number; y: number } | null>(null)
  /** 当前是否处于上/下限（用于把手 + 气泡变警示色，撑到限位前保持 null） */
  const limitState = ref<'min' | 'max' | null>(null)
  /** 撞限一次性抖动的触发计数：变化即代表"新撞了一次限"，组件据此重放一次动画 */
  const limitPulse = ref(0)
  const limitTracker = createLimitPulseTracker()

  const maxSpanForIndex = (index: number): number => {
    if (!params.maxSpanFor) return MAX_SPAN
    return clampSpan(params.maxSpanFor(index, params.items.value), MAX_SPAN)
  }

  const setColSpanAt = (index: number, nextSpan: number) => {
    const field = params.items.value[index]
    if (!field) return
    const next = [...params.items.value]
    next[index] = withColSpanClass(field, nextSpan)
    params.items.value = next
  }

  let prevBodyCursor = ''
  let prevBodyUserSelect = ''
  const lockBodyCursor = () => {
    prevBodyCursor = document.body.style.cursor
    prevBodyUserSelect = document.body.style.userSelect
    document.body.style.setProperty('cursor', 'ew-resize', 'important')
    document.body.style.setProperty('user-select', 'none', 'important')
  }
  const unlockBodyCursor = () => {
    document.body.style.cursor = prevBodyCursor
    document.body.style.userSelect = prevBodyUserSelect
  }

  const startResize = (e: PointerEvent, index: number) => {
    resizingIndex.value = index
    resizingPointerId.value = e.pointerId
    startX.value = e.clientX
    startSpan.value = parseColSpan(params.items.value[index])
    pointerPosition.value = { x: e.clientX, y: e.clientY }
    limitState.value = null
    limitTracker.reset()
    const el = (params.containerRef.value as unknown as HTMLElement | null) ?? null
    if (el) {
      const rect = el.getBoundingClientRect()
      columnWidth.value = rect.width / 12
    }
    lockBodyCursor()
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (resizingIndex.value === null) return
    if (resizingPointerId.value !== null && e.pointerId !== resizingPointerId.value) return
    pointerPosition.value = { x: e.clientX, y: e.clientY }
    if (!columnWidth.value) return
    const deltaX = e.clientX - startX.value
    const requestedSpan = computeSpanFromDelta(startSpan.value, deltaX, columnWidth.value)
    // 输入组：当前项最大只能占到 12 - 其余项之和，向外拖（放大）超限时被钳制
    const max = maxSpanForIndex(resizingIndex.value)
    limitState.value = detectLimitHit(requestedSpan, max)
    limitPulse.value = limitTracker.update(limitState.value)
    setColSpanAt(resizingIndex.value, clampSpan(requestedSpan, max))
  }

  const onPointerUp = (e: PointerEvent) => {
    if (resizingPointerId.value !== null && e.pointerId !== resizingPointerId.value) return
    resizingIndex.value = null
    resizingPointerId.value = null
    pointerPosition.value = null
    limitState.value = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    unlockBodyCursor()
    params.onResizeEnd()
  }

  // 组件卸载时兜底：万一拖动到一半整个画布被卸载（切换设计器实例等），恢复
  // body 光标/选区样式并摘掉残留的 window 监听器，不让下一个页面继承 ew-resize
  onUnmounted(() => {
    if (resizingIndex.value === null) return
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    unlockBodyCursor()
  })

  // 键盘调宽（← / →）：焦点在把手上时每次 ±1 列，与拖动结束走同一条提交路径
  // （onResizeEnd → commitSchemaReconcile），可被 Ctrl+Z 撤销。到达上下限时不再
  // 写入新值，只触发一次撞限反馈。
  const adjustSpanByKeyboard = (index: number, delta: number) => {
    const field = params.items.value[index]
    if (!field) return
    const current = parseColSpan(field)
    const max = maxSpanForIndex(index)
    const requested = current + delta
    const hit = detectLimitHit(requested, max)
    if (hit) limitPulse.value = limitTracker.update(hit)
    else limitTracker.reset()
    const next = clampSpan(requested, max)
    if (next === current) return
    setColSpanAt(index, next)
    params.onResizeEnd()
  }

  // 双击把手：恢复整行（普通字段 12 列；输入组恢复到 maxSpanFor 允许的最大值），
  // 同样走提交路径、可撤销。
  const resetSpanToFull = (index: number) => {
    const field = params.items.value[index]
    if (!field) return
    const max = maxSpanForIndex(index)
    if (parseColSpan(field) === max) return
    setColSpanAt(index, max)
    params.onResizeEnd()
  }

  return {
    resizingIndex,
    pointerPosition,
    limitState,
    limitPulse,
    startResize,
    adjustSpanByKeyboard,
    resetSpanToFull,
    maxSpanForIndex,
  }
}
