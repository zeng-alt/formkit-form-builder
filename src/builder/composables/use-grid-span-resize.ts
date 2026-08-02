import { ref, type Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { getColSpan as parseColSpan } from '@/utils/dnd/grid'

function withColSpanClass(field: FormKitSchemaFormKit, span: number) {
  const safeSpan = Math.max(1, Math.min(12, Math.round(span)))
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
  return { ...(field as any), outerClass: classes || undefined } as FormKitSchemaFormKit
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

  const setColSpanAt = (index: number, nextSpan: number) => {
    const field = params.items.value[index]
    if (!field) return
    const next = [...params.items.value]
    next[index] = withColSpanClass(field, nextSpan)
    params.items.value = next
  }

  const startResize = (e: PointerEvent, index: number) => {
    resizingIndex.value = index
    resizingPointerId.value = e.pointerId
    startX.value = e.clientX
    startSpan.value = parseColSpan(params.items.value[index])
    const el = (params.containerRef.value as unknown as HTMLElement | null) ?? null
    if (el) {
      const rect = el.getBoundingClientRect()
      columnWidth.value = rect.width / 12
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (resizingIndex.value === null) return
    if (resizingPointerId.value !== null && e.pointerId !== resizingPointerId.value) return
    if (!columnWidth.value) return
    const deltaX = e.clientX - startX.value
    const deltaSpan = Math.round(deltaX / columnWidth.value)
    let nextSpan = startSpan.value + deltaSpan
    // 输入组：当前项最大只能占到 12 - 其余项之和，向外拖（放大）超限时被钳制
    if (params.maxSpanFor && resizingIndex.value !== null) {
      const max = Math.max(1, params.maxSpanFor(resizingIndex.value, params.items.value))
      nextSpan = Math.min(nextSpan, max)
    }
    setColSpanAt(resizingIndex.value, nextSpan)
  }

  const onPointerUp = (e: PointerEvent) => {
    if (resizingPointerId.value !== null && e.pointerId !== resizingPointerId.value) return
    resizingIndex.value = null
    resizingPointerId.value = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    params.onResizeEnd()
  }

  return {
    resizingIndex,
    startResize,
  }
}
