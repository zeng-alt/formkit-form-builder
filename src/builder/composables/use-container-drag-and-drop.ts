import { computed, ref, unref, watch, type ComputedRef } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { parents, setParentValues } from '@formkit/drag-and-drop'
import { customInsertPlugin } from '@/utils/custom-insert-plugin'
import { eq } from '@/utils/utils'
import { createDefaultInsertPointElement } from '@/utils/dnd/insert-point-element'
import { CANVAS_DRAGGING_CLASS, CANVAS_DROP_ZONE_CLASS } from '@/utils/dnd/drag-classes'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '@/i18n/context'
import { useCanvasSchemaContext } from './canvas-schema-context'
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
  /** L2：拖拽悬停时容器左上角标签显示的名称（容器自身标题或类型名）；
   *  不传则该容器不显示悬停标签（如数据表格等不接受画布字段拖放的容器） */
  containerLabel?: () => string
  /** L3：accepts 拒绝时的原因一句话（如“按钮组只能放按钮”）；不传则只显示通用提示 */
  describeRejection?: () => string
}) {
  // 所属画布实例状态：多设计器并存时，容器的根 / 提交漏斗绑定到各自实例。
  // 容器组件总是渲染在 FormBuilder 或 FormRenderer（含 BuilderPreview 内部转发）子树内，
  // 二者都会 provide 状态；真走到子树外说明组件被挪用了，useFormBuilderState() 会直接报错。
  const state = useFormBuilderState()
  const { t } = useFormBuilderI18n()
  // 面板拖入新元素提交后自动选中（L6）：selectByKey 由画布根统一提供，容器组件
  // 都渲染在画布子树内，这里同 CardContainer 等容器一样直接 inject 即可。
  const canvasCtx = useCanvasSchemaContext()
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
    t,
    selectByKey: canvasCtx?.selectByKey,
    containerLabel: params.containerLabel,
    describeRejection: params.describeRejection,
  }

  // 拷贝初始值：直接把投影数组交给 DnD 库，库内部可能原地改写数组（见 dnd/commit.ts
  // 的 setParentValues 用法），不拷贝会污染 dslToSchema 的缓存投影
  const [containerRef, items, updateConfig] = useDragAndDrop<T>([...params.modelValue.value], {
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
    draggable: (el: HTMLElement) => el.getAttribute('data-canvas-item') === 'true',
    disabled: !enabled.value,
    dragHandle: dragHandle.value,
    draggingClass: CANVAS_DRAGGING_CLASS,
    dropZoneClass: CANVAS_DROP_ZONE_CLASS,
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
        detail: { parent: active ? { el, data } : null },
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
        setParentValues(el, data, [...next])
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
