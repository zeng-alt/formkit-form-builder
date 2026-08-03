import { computed, ref, unref, watch, type ComputedRef } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { parents, setParentValues } from '@formkit/drag-and-drop'
import { customInsertPlugin } from '@/utils/custom-insert-plugin'
import { eq } from '@/utils/utils'
import { createDefaultInsertPointElement } from '@/utils/dnd/insert-point-element'

export function useContainerDragAndDrop<T>(params: {
  modelValue: ComputedRef<T[]>
  onUpdateModelValue: (value: T[]) => void
  rootSelector?: string
  insertPoint?: () => HTMLElement
  enabled?: boolean | ComputedRef<boolean>
  dragHandle?: string | ComputedRef<string | undefined>
  /** 拖入校验：返回 false 时该容器拒绝接收被拖节点（如按钮组只收按钮） */
  accepts?: (value: T) => boolean
}) {
  const rootSelector = computed(() => params.rootSelector ?? '[data-testid="drop-area"]')
  const insertPoint = computed(() => params.insertPoint ?? createDefaultInsertPointElement)
  const enabled = computed(() => unref(params.enabled) ?? true)
  const dragHandle = computed(() => unref(params.dragHandle))

  const [containerRef, items, updateConfig] = useDragAndDrop<T>(params.modelValue.value, {
    group: 'form-builder',
    nativeDrag: true,
    // 校验被拖节点类型。值来源优先级：activeState（拖拽起始节点）→ currentTargetValue
    // → draggedNodes（drop 提交路径 handleEnd 里 activeState 已清空，靠它兜底）
    accepts: (_target, _initial, _current, state) => {
      if (!params.accepts) return true
      const s = state as {
        activeState?: { node?: { data?: { value?: T } } }
        currentTargetValue?: T
        draggedNodes?: Array<{ data?: { value?: T } }>
      }
      const value =
        s.activeState?.node?.data?.value ??
        s.currentTargetValue ??
        s.draggedNodes?.[0]?.data?.value
      return params.accepts(value as T)
    },
    sortable: enabled.value,
    draggable: () => true,
    disabled: !enabled.value,
    dragHandle: dragHandle.value,
    plugins: [
      customInsertPlugin({
        insertPoint: insertPoint.value,
      }),
    ],
    handleNodePointerup(data) {
      data.targetData.node.el.setAttribute('draggable', 'true')
    },
  })

  const syncingFromProps = ref(false)

  const rootDropAreaEl = () => document.querySelector(rootSelector.value) as HTMLElement | null

  const setNestedParentOnRoot = (active: boolean) => {
    const root = rootDropAreaEl()
    if (!root) return
    const el = (containerRef.value as unknown as HTMLElement | null) ?? null
    const data = el ? parents.get(el) : undefined
    if (!el || !data) return
    root.dispatchEvent(
      new CustomEvent('hasNestedParent', {
        detail: { parent: active ? ({ el, data } as any) : null },
      }),
    )
  }

  watch(
    params.modelValue,
    (next) => {
      if (!Array.isArray(next)) return
      if (eq(next, items.value)) return
      syncingFromProps.value = true
      const el = (containerRef.value as unknown as HTMLElement | null) ?? null
      const data = el ? parents.get(el) : undefined
      if (el && data) {
        setParentValues(el, data, [...next] as any)
      } else {
        items.value = [...next]
      }
      queueMicrotask(() => {
        syncingFromProps.value = false
      })
    },
    { deep: true },
  )

  watch([enabled, dragHandle], ([nextEnabled, nextDragHandle]) => {
    updateConfig({
      sortable: nextEnabled,
      disabled: !nextEnabled,
      dragHandle: nextEnabled ? nextDragHandle : undefined,
    })
  })

  const emitUpdate = () => {
    if (syncingFromProps.value) return
    params.onUpdateModelValue([...items.value])
  }

  return {
    containerRef,
    items,
    emitUpdate,
    setNestedParentOnRoot,
  }
}
