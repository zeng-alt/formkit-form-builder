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
import { getVisualRows, setColSpan, adjustColSpansForInsertAtRow, rebalanceRowSpans, stripInputGroupOuterClass } from './grid'
import { collectSchemaNames, generateKey, generateNextFieldName } from './schema'
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
    el.getAttribute('data-tabs-key') ||
    el.getAttribute('data-tabs-pane-key') ||
    el.getAttribute('data-group-key')
  return raw && raw.trim() ? raw : null
}

function normalizeInsertValues(
  insertValues: FormKitSchemaFormKit[],
  isSource: boolean,
): FormKitSchemaFormKit[] {
  if (!isSource) return insertValues
  const existingNames = new Set<string>()
  collectSchemaNames(formSchema.value, existingNames)
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
      if (val.$cmp === 'list' || val.$formkit === 'list') {
        const props = { ...val.props, listKey: nextKey }
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
      if (val.$cmp === 'card' || val.$formkit === 'card') {
        const props = { ...val.props, cardKey: nextKey }
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
      if (val.$cmp === 'inputGroup' || val.$formkit === 'inputGroup') {
        const props = {
          ...val.props,
          inputGroupKey: nextKey,
        }
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
      if (val.$cmp === 'tabs' || val.$formkit === 'tabs') {
        const props = {
          ...val.props,
          tabsKey: nextKey,
        }
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
      if (data) return { el: current, data } as any as ParentRecord<T>
      current = current.parentElement
    }
    return state.currentParent
  }

  const targetParent = resolveTargetParent()

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

  const insertValues = normalizeInsertValues(insertValuesRaw, isSource)

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

  const rootEl = document.querySelector('[data-testid="drop-area"]') as HTMLElement | null
  const rootData = rootEl ? parents.get(rootEl) : undefined
  if (!rootEl || !rootData) return

  let rootValues: FormKitSchemaFormKit[] = parentValues(rootEl, rootData) as any
  if (rootEl === sourceParent.el && sourceNextValues) rootValues = sourceNextValues
  if (rootEl === targetParent.el && targetNextValues) rootValues = targetNextValues

  const listMap = new Map<string, FormKitSchemaFormKit[]>()
  const listEls = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-list-key],[data-card-key],[data-input-group-key],[data-tabs-key],[data-tabs-pane-key],[data-group-key]',
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
      const children = isInputGroup ? normalizeInputGroupChildren(rawChildren as any) : rawChildren
      next = { ...node, children }
      if (next.$cmp) {
        next.props = { ...next.props }
        if (next.props && typeof next.props === 'object') delete next.props.modelValue
      }
    } else {
      const isList = node.$formkit === 'list' || node.$cmp === 'list'
      const isCard = node.$formkit === 'card' || node.$cmp === 'card'
      const isInputGroup = node.$formkit === 'inputGroup' || node.$cmp === 'inputGroup'
      const isTabs = node.$formkit === 'tabs' || node.$cmp === 'tabs'
      if ((isList || isCard || isInputGroup || isTabs) && !Array.isArray(node.children)) {
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

  commitSchemaReconcile(nextSchema, { reason: 'dnd' })

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
