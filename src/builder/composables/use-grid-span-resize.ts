import { ref, type Ref } from 'vue'
import type { DslNode } from '@/dsl/types'

export function useGridSpanResize(params: {
  items: Ref<DslNode[]>
  containerRef: Ref<unknown>
  onResizeEnd: () => void
}) {
  const resizingIndex = ref<number | null>(null)
  const resizingPointerId = ref<number | null>(null)
  const startX = ref(0)
  const startSpan = ref(12)
  const columnWidth = ref(0)

  const setColSpanAt = (index: number, nextSpan: number) => {
    const field = params.items.value[index]
    if (!field) return
    const safeSpan = Math.max(1, Math.min(12, Math.round(nextSpan)))
    const next = [...params.items.value]
    next[index] = { ...field, layout: { ...field.layout, span: safeSpan } }
    params.items.value = next
  }

  const startResize = (e: PointerEvent, index: number) => {
    resizingIndex.value = index
    resizingPointerId.value = e.pointerId
    startX.value = e.clientX
    startSpan.value = Number(params.items.value[index]?.layout?.span ?? 12)
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
    setColSpanAt(resizingIndex.value, startSpan.value + deltaSpan)
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
