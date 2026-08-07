import { computed, ref, unref, watch, type ComputedRef } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { parents, setParentValues } from '@formkit/drag-and-drop'
import { customInsertPlugin } from '@/utils/custom-insert-plugin'
import { eq } from '@/utils/utils'
import { createDefaultInsertPointElement } from '@/utils/dnd/insert-point-element'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import type { DndContext } from '@/utils/dnd/context'

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
  // 所属画布实例状态：多设计器并存时，容器的根 / 提交漏斗绑定到各自实例。
  // 预览等非 Builder 子树内调用会回落到默认实例，DnD 禁用时不影响。
  const state = useFormBuilderState()
  const rootSelector = computed(
    () => params.rootSelector ?? `[data-testid="drop-area-${state.instanceId}"]`,
  )
  const insertPoint = computed(() => params.insertPoint ?? createDefaultInsertPointElement)
  const enabled = computed(() => unref(params.enabled) ?? true)
  const dragHandle = computed(() => unref(params.dragHandle))

  // 挂到本容器 parent 的 config 上，供提交/插入定位读取所属画布实例。
  const dndContext: DndContext = {
    formSchema: state.formSchema,
    commitSchemaReconcile: state.commitSchemaReconcile,
  }

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
        s.activeState?.node?.data?.value ?? s.currentTargetValue ?? s.draggedNodes?.[0]?.data?.value
      return params.accepts(value as T)
    },
    sortable: enabled.value,
    draggable: () => true,
    disabled: !enabled.value,
    dragHandle: dragHandle.value,
    plugins: [
      customInsertPlugin(
        {
          insertPoint: insertPoint.value,
        },
        dndContext,
      ),
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
