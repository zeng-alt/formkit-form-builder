import type {
  BaseDragState,
  DragState,
  NodeRecord,
  ParentRecord,
  SynthDragState,
} from '@formkit/drag-and-drop'
import {
  isDragState,
  isSynthDragState,
  parents,
  parentValues,
  removeClass,
  setParentValues,
} from '@formkit/drag-and-drop'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { commitSchemaReconcile } from '@/composables/schema-history'
import { formSchema } from '@/state/form-schema'
import { insertState } from './insert-state'
import { findRootDropAreaEl, type DndContext } from './context'
import { getVisualRows, setColSpan, adjustColSpansForInsertAtRow, rebalanceRowSpans, stripInputGroupOuterClass } from './grid'
import { collectSchemaNames, generateKey, generateNextFieldName } from './schema'
import { getContainerSpec } from '@/elements/container-spec'
import { eq } from '@/utils/utils'

function normalizeInputGroupChildren(children: FormKitSchemaFormKit[]) {
  const list = Array.isArray(children) ? children : []
  if (list.length === 0) return []
  if (list.length === 1) {
    const only = list[0] as any
    setColSpan(only, 12)
    return [stripInputGroupOuterClass(only) as any]
  }
  // 输入组单行：总 col-span 不得超过 12（一行网格上限），超出按比例缩放，避免溢出容器。
  // 宽度只记 layout.colspan（经 col-span-N 往返回读），不再往 outerClass 写 w-[xx%]
  rebalanceRowSpans(list, 12)
  return list.map((child: any) => stripInputGroupOuterClass(child))
}

function getContainerKey(el: HTMLElement | null | undefined): string | null {
  if (!el) return null
  const raw =
    el.getAttribute('data-list-key') ||
    el.getAttribute('data-card-key') ||
    el.getAttribute('data-input-group-key') ||
    el.getAttribute('data-button-group-key') ||
    el.getAttribute('data-tabs-key') ||
    el.getAttribute('data-tabs-pane-key') ||
    el.getAttribute('data-group-key')
  return raw && raw.trim() ? raw : null
}

function normalizeInsertValues(
  insertValues: FormKitSchemaFormKit[],
  isSource: boolean,
  existingSchema: FormKitSchemaFormKit[],
): FormKitSchemaFormKit[] {
  if (!isSource) return insertValues
  const existingNames = new Set<string>()
  collectSchemaNames(existingSchema, existingNames)
  return insertValues.map((value: any) => {
    const valObj = JSON.parse(JSON.stringify(value))
    if (typeof valObj === 'object' && valObj !== null) {
      const val = valObj as any
      if (val.$formkit === 'submit' && Array.isArray(val.children)) {
        delete val.children
      }
      const nextKey = typeof val.__key === 'string' && val.__key ? val.__key : generateKey()
      const nextName =
        val.$formkit === 'submit' ? val.name : generateNextFieldName(existingNames)
      if (val.$formkit === 'submit')
        return { ...valObj, __key: nextKey, outerClass: 'col-span-12 pt-2' }
      // $cmp 节点的语义 name 在 props.name（DSL 回读取 props），顶层 name 仅画布展示，需同步
      if (typeof val.$cmp === 'string') {
        val.props =
          val.props && typeof val.props === 'object'
            ? { ...val.props, name: nextName }
            : { name: nextName }
      }
      // 容器按规格注入各自的身份键（keyProp），不再逐个 kind 硬编码；
      // modelValue 由 children 承载，统一从 props 删除（DSL 往返经 CONTAINER_INTERNAL_PROPS 剥离）
      const spec = getContainerSpec(val.$cmp ?? val.$formkit)
      if (spec && spec.primitive === 'cmp') {
        const props = { ...val.props, [spec.keyProp]: nextKey }
        if (props && typeof props === 'object') delete (props as any).modelValue
        return {
          ...valObj,
          __key: nextKey,
          name: nextName,
          id: `field_${nextKey}`,
          props,
          children: Array.isArray(val.children) ? val.children : [],
          outerClass: val.outerClass || 'col-span-12',
        }
      }
      return {
        ...valObj,
        __key: nextKey,
        name: nextName,
        id: `field_${nextKey}`,
        outerClass: val.outerClass || 'col-span-12',
      }
    }
    return valObj
  }) as FormKitSchemaFormKit[]
}

// 调整横向插入时的 col-span：优先使用 explicitRow（row-span>1 的精确命中），否则回退到“视觉行”算法
function adjustColSpansForInsert(
  targetParentValues: any[],
  draggedOverValue: any,
  insertValues: any[],
  isVertical: boolean,
) {
  const parentEl = (insertState.insertPoint as any)?.parent?.el as HTMLElement | undefined
  const axis = parentEl?.getAttribute('data-dnd-axis')
  const isInputGroup = Boolean(parentEl?.getAttribute('data-input-group-key'))
  if (axis === 'x' && !isInputGroup) return

  if (isVertical) {
    insertValues.forEach((val) => setColSpan(val, 12))
    return
  }

  const explicitRow = insertState.explicitRow
  if (typeof explicitRow === 'number' && Number.isFinite(explicitRow)) {
    adjustColSpansForInsertAtRow(targetParentValues, explicitRow, insertValues)
    return
  }

  const rows = getVisualRows(targetParentValues)
  const targetRow = rows.find((r) => r.items.includes(draggedOverValue))

  if (!targetRow) {
    insertValues.forEach((val) => setColSpan(val, 12))
    return
  }

  const currentCount = targetRow.items.length
  const addedCount = insertValues.length
  const totalCount = currentCount + addedCount

  if (totalCount <= 4) {
    const newSpan = 12 / totalCount
    targetRow.items.forEach((item) => setColSpan(item, newSpan))
    insertValues.forEach((val) => setColSpan(val, newSpan))
  } else {
    insertValues.forEach((val) => setColSpan(val, 3))
  }
}

// 处理 dragEnd：根据 insertState 决定最终插入位置，并提交到 schema 历史
export function handleEnd<T>(state: DragState<T> | SynthDragState<T> | BaseDragState<T>) {
  if (!isDragState(state) && !isSynthDragState(state)) return

  const insertPoint = insertState.insertPoint
  const sourceParent = state.initialParent
  const resolveTargetParent = (): ParentRecord<T> => {
    const byInsertState = insertState.draggedOverParent as any as ParentRecord<T> | null
    if (byInsertState?.el && parents.get(byInsertState.el)) return byInsertState

    const coords = (state as any).coordinates as { x?: number; y?: number } | undefined
    if (coords?.x === undefined || coords?.y === undefined) return state.currentParent
    const clientX = coords.x - (window.scrollX || document.documentElement.scrollLeft)
    const clientY = coords.y - (window.scrollY || document.documentElement.scrollTop)

    const el = document.elementFromPoint(clientX, clientY)
    let current = el instanceof HTMLElement ? el : null
    while (current) {
      const data = parents.get(current)
      if (data) {
        const candidate = { el: current, data } as any as ParentRecord<T>
        // 目标容器配置了 accepts 但拒绝了被拖节点（如按钮组只收按钮）：
        // 不能直接落入该容器，继续向上找下一个可接收的父级（通常是根 drop-area）
        const accepts = (data.config as any)?.accepts
        if (typeof accepts === 'function') {
          let accepted = true
          try {
            accepted = accepts(candidate, state.initialParent, state.currentParent, state)
          } catch {
            accepted = true
          }
          if (!accepted) {
            current = current.parentElement
            continue
          }
        }
        return candidate
      }
      current = current.parentElement
    }
    return state.currentParent
  }

  const targetParent = resolveTargetParent()

  // 所属画布实例的 DnD 上下文：拖放提交可能来自调色板（无上下文），
  // 但目标 parent 一定在某个画布内，其 config 上挂着该画布的 formSchema / 提交漏斗。
  const ctx = (targetParent.data.config as any)?.dndContext as DndContext | undefined
  const schemaForNames = ctx?.formSchema.value ?? formSchema.value

  const sourceListKey = getContainerKey(sourceParent.el as any)
  const targetListKey = getContainerKey(targetParent.el as any)

  const draggedValues = state.draggedNodes.map(
    (node) => node.data.value,
  ) as any as FormKitSchemaFormKit[]
  const draggedKeys = new Set<string>()
  for (const v of draggedValues as any[]) {
    const k = v?.__key
    if (typeof k === 'string' && k) draggedKeys.add(k)
  }

  const isSource = sourceParent.el.getAttribute('data-is-source') === 'true'

  const sourceValues = parentValues(
    sourceParent.el,
    sourceParent.data,
  ) as any as FormKitSchemaFormKit[]
  const targetValues = parentValues(
    targetParent.el,
    targetParent.data,
  ) as any as FormKitSchemaFormKit[]

  const draggedOverNode = insertState.draggedOverNodes[0] as any as NodeRecord<T> | undefined
  const explicitIndex = insertState.explicitIndex
  const usedExplicitIndex = typeof explicitIndex === 'number' && Number.isFinite(explicitIndex)

  let index = targetValues.length
  if (insertState.draggedOverParent) index = 0
  if (draggedOverNode) index = draggedOverNode.data.index || 0
  if (usedExplicitIndex) index = explicitIndex as number
  if (!usedExplicitIndex && draggedOverNode && insertState.ascending) index++

  index = Math.max(0, Math.min(targetValues.length, index))

  const insertValuesRaw =
    sourceParent.data.config.insertConfig?.dynamicValues && isSource
      ? (sourceParent.data.config.insertConfig.dynamicValues({
          sourceParent,
          targetParent,
          draggedNodes: state.draggedNodes,
          targetNodes: insertState.draggedOverNodes as any,
          targetIndex: index,
        }) as any as FormKitSchemaFormKit[])
      : (draggedValues as any as FormKitSchemaFormKit[])

  const insertValues = normalizeInsertValues(insertValuesRaw, isSource, schemaForNames)

  let sourceNextValues: FormKitSchemaFormKit[] | null = null
  let targetNextValues: FormKitSchemaFormKit[] | null = null

  if (sourceParent.el === targetParent.el) {
    const remaining = sourceValues.filter((v: any) => {
      const k = v?.__key
      if (typeof k === 'string' && k) return !draggedKeys.has(k)
      return !draggedValues.some((y) => eq(v, y))
    }) as any as FormKitSchemaFormKit[]

    const removedBefore = state.draggedNodes.filter((n) => n.data.index < index).length
    const nextIndex = Math.max(0, Math.min(remaining.length, index - removedBefore))

    if (draggedOverNode) {
      adjustColSpansForInsert(
        remaining as any[],
        draggedOverNode.data.value,
        insertValues as any[],
        insertState.verticalInsert ?? false,
      )
    } else {
      insertValues.forEach((val: any) => setColSpan(val, 12))
    }

    remaining.splice(nextIndex, 0, ...(insertValues as any as FormKitSchemaFormKit[]))
    setParentValues(sourceParent.el, sourceParent.data, [...remaining] as any)
    sourceNextValues = remaining as any
  } else {
    if (!isSource) {
      const remaining = sourceValues.filter((v: any) => {
        const k = v?.__key
        if (typeof k === 'string' && k) return !draggedKeys.has(k)
        return !draggedValues.some((y) => eq(v, y))
      }) as any as FormKitSchemaFormKit[]
      setParentValues(sourceParent.el, sourceParent.data, [...remaining] as any)
      sourceNextValues = remaining as any
    }

    const nextTargetValues = [...targetValues]

    if (draggedOverNode) {
      adjustColSpansForInsert(
        nextTargetValues as any[],
        draggedOverNode.data.value,
        insertValues as any[],
        insertState.verticalInsert ?? false,
      )
    } else {
      insertValues.forEach((val: any) => setColSpan(val, 12))
    }

    nextTargetValues.splice(index, 0, ...(insertValues as any as FormKitSchemaFormKit[]))
    setParentValues(targetParent.el, targetParent.data, [...nextTargetValues] as any)
    targetNextValues = nextTargetValues as any
  }

  // 从目标向上找所属画布根（多实例时各自作用域，不再全局 querySelector）。
  const rootEl = findRootDropAreaEl(targetParent.el as HTMLElement | null)
  const rootData = rootEl ? parents.get(rootEl) : undefined
  if (!rootEl || !rootData) return

  let rootValues: FormKitSchemaFormKit[] = parentValues(rootEl, rootData) as any
  if (rootEl === sourceParent.el && sourceNextValues) rootValues = sourceNextValues
  if (rootEl === targetParent.el && targetNextValues) rootValues = targetNextValues

  const listMap = new Map<string, FormKitSchemaFormKit[]>()
  const listEls = Array.from(
    rootEl.querySelectorAll<HTMLElement>(
      '[data-list-key],[data-card-key],[data-input-group-key],[data-button-group-key],[data-tabs-key],[data-tabs-pane-key],[data-group-key]',
    ),
  )
  for (const el of listEls) {
    const key = getContainerKey(el)
    if (!key) continue
    const data = parents.get(el)
    if (!data) continue
    let vals = parentValues(el, data) as any as FormKitSchemaFormKit[]
    if (sourceListKey && key === sourceListKey && sourceNextValues && sourceParent.el !== rootEl) {
      vals = sourceNextValues as any
    }
    if (targetListKey && key === targetListKey && targetNextValues && targetParent.el !== rootEl) {
      vals = targetNextValues as any
    }
    const cleaned = vals.map((v: any) => {
      if (v?.$formkit === 'submit' && Array.isArray(v.children)) {
        const next = { ...v }
        delete next.children
        return next
      }
      return v
    })
    listMap.set(key, cleaned)
  }

  const applyListMap = (node: any): any => {
    if (!node || typeof node !== 'object') return node
    if (node.$formkit === 'submit' && Array.isArray(node.children)) {
      const next = { ...node }
      delete next.children
      return next
    }

    const key = node.__key
    let next: any = node

    if (typeof key === 'string' && key && listMap.has(key)) {
      const rawChildren = listMap.get(key) ?? []
      const isInputGroup = node.$formkit === 'inputGroup' || node.$cmp === 'inputGroup'
      const isButtonGroup = node.$formkit === 'buttonGroup' || node.$cmp === 'buttonGroup'
      const children = isInputGroup
        ? normalizeInputGroupChildren(rawChildren as any)
        : isButtonGroup
          ? (rawChildren as any[]).map((c: any) => stripInputGroupOuterClass(c))
          : rawChildren
      next = { ...node, children }
      if (next.$cmp) {
        next.props = { ...next.props }
        if (next.props && typeof next.props === 'object') delete next.props.modelValue
      }
    } else {
      // 有容器规格（非原生 group）且缺 children → 补空数组（group 用 name 作数据键，无需兜底）
      const spec = getContainerSpec(node.$cmp ?? node.$formkit)
      if (spec && spec.primitive === 'cmp' && !Array.isArray(node.children)) {
        next = { ...node, children: [] }
        if (next.$cmp) {
          next.props = { ...next.props }
          if (next.props && typeof next.props === 'object') delete next.props.modelValue
        }
      }
    }

    if (Array.isArray(next.children)) {
      const nextChildren = next.children.map((c: any) => applyListMap(c))
      next = { ...next, children: nextChildren }
    }
    return next
  }

  const nextSchema = rootValues.map((node: any) => applyListMap(node)) as FormKitSchemaFormKit[]

  // 用所属画布实例的提交漏斗写回（未解析到上下文时回落到默认实例，保持既有行为）。
  const commit = ctx?.commitSchemaReconcile ?? commitSchemaReconcile
  commit(nextSchema, { reason: 'dnd' })

  if (insertPoint) insertPoint.el.style.display = 'none'

  const dropZoneClass = isSynthDragState(state)
    ? state.initialParent.data.config.synthDropZoneClass
    : state.initialParent.data.config.dropZoneClass

  removeClass(
    insertState.draggedOverNodes.map((node) => node.el),
    dropZoneClass,
  )
  if (insertState.draggedOverParent) {
    removeClass(
      [insertState.draggedOverParent.el],
      insertState.draggedOverParent.data.config.dropZoneClass,
    )
  }

  insertState.draggedOverNodes = []
  insertState.draggedOverParent = null
  insertState.explicitIndex = undefined
  insertState.explicitRow = undefined
}
