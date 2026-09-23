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
import { insertState } from './insert-state'
import { findRootDropAreaEl, type DndParentConfig } from './context'
import {
  getVisualRows,
  setColSpan,
  adjustColSpansForInsertAtRow,
  rebalanceRowSpans,
  stripInputGroupOuterClass,
} from './grid'
import { collectSchemaNames, generateKey, generateNextFieldName } from './schema'
import { getContainerSpec } from '@/elements/container-spec'
import { schemaContainsSteps } from '@/utils/schema/steps'
import { eq } from '@/utils/utils'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'

// toSchema 用 id 兜底生成 name（UUID 形态）：视为无有效名，拖入时重新生成唯一名
const UUID_NAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeInputGroupChildren(children: FormKitSchemaFormKit[]) {
  // 防御性拷贝：不确定调用方数组是否会被其它地方保留引用，setColSpan/rebalanceRowSpans
  // 只改数组自己的下标（不改节点对象），但拷贝一份仍更安全，成本可忽略
  const list = Array.isArray(children) ? [...children] : []
  if (list.length === 0) return []
  if (list.length === 1) {
    const only = setColSpan(list[0], 12)
    return [stripInputGroupOuterClass(only)]
  }
  // 输入组单行：总 col-span 不得超过 12（一行网格上限），超出按比例缩放，避免溢出容器。
  // 宽度只记 outerClass 的 col-span-N（经 col-span-N 往返回读），不再往 outerClass 写 w-[xx%]
  rebalanceRowSpans(list, 12)
  return list.map((child) => stripInputGroupOuterClass(child))
}

function getContainerKey(el: HTMLElement | null | undefined): string | null {
  if (!el) return null
  const raw =
    el.getAttribute('data-list-key') ||
    el.getAttribute('data-card-key') ||
    el.getAttribute('data-input-group-key') ||
    el.getAttribute('data-button-group-key') ||
    el.getAttribute('data-badge-key') ||
    el.getAttribute('data-tabs-key') ||
    el.getAttribute('data-tabs-pane-key') ||
    el.getAttribute('data-steps-pane-key') ||
    el.getAttribute('data-steps-key') ||
    el.getAttribute('data-group-key')
  return raw && raw.trim() ? raw : null
}

/** 是否为根 drop-area（画布根，steps 向导仅允许落在这里） */
function isRootDropArea(el: HTMLElement | null | undefined): boolean {
  if (!el) return false
  const testId = el.getAttribute('data-testid')
  return typeof testId === 'string' && testId.startsWith('drop-area-')
}

/** 阻止一次拖放：清掉插入点与 dropZone 高亮后直接返回，不写任何数据 */
function abortDrop<T>(state: DragState<T> | SynthDragState<T> | BaseDragState<T>) {
  if (insertState.insertPoint) insertState.insertPoint.el.style.display = 'none'
  if (isDragState(state)) {
    const dropZoneClass = isSynthDragState(state)
      ? state.initialParent.data.config.synthDropZoneClass
      : state.initialParent.data.config.dropZoneClass
    removeClass(
      insertState.draggedOverNodes.map((node) => node.el),
      dropZoneClass,
    )
  }
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

/** steps 拖入根画布时预置的第一个 step pane（画布身份 + __paneType 标记保证往返还原为 stepsPane）。
 *  pane 是纯数据占位对象（__key/name/label/children），不是 $formkit/$cmp/$el 判别式节点，
 *  SchemaNode（继承自 FormKitSchemaFormKit）把 $formkit 声明为必填，这里没有则不适用。 */
function createStepsPane(): any {
  return {
    __key: generateKey(),
    // 自动生成稳定 name：作为 pane 内容的 group 数据键，不随 label 编辑变化，避免改标题后旧数据丢失
    name: `step_${Math.random().toString(36).slice(2, 8)}`,
    __paneType: 'steps',
    label: 'Step 1',
    outerClass: 'col-span-12',
    children: [],
  }
}

function normalizeInsertValues(
  insertValues: FormKitSchemaFormKit[],
  isSource: boolean,
  existingSchema: FormKitSchemaFormKit[],
): FormKitSchemaFormKit[] {
  if (!isSource) return insertValues
  const existingNames = new Set<string>()
  collectSchemaNames(existingSchema, existingNames)

  // 递归为容器子节点（如 nestedList 内置 group）生成唯一 name：与普通元素一致，
  // 不做写死的显示名。只处理"没有有效 name"的节点（缺省 / 裸 id / UUID 兜底名）。
  const nameChildren = (nodes: SchemaNode[] | undefined) => {
    if (!Array.isArray(nodes)) return
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue
      const rawName = typeof n.name === 'string' ? n.name : ''
      const isUuidName = UUID_NAME_RE.test(rawName)
      if (!rawName || isUuidName || rawName === n.id || rawName === n.__key) {
        const next = generateNextFieldName(existingNames)
        if (typeof n.$cmp === 'string') {
          n.props =
            n.props && typeof n.props === 'object' ? { ...n.props, name: next } : { name: next }
        } else {
          n.name = next
        }
      }
      nameChildren(schemaChildren(n))
    }
  }

  return insertValues.map((value) => {
    const valObj = JSON.parse(JSON.stringify(value))
    if (typeof valObj === 'object' && valObj !== null) {
      const val: SchemaNode = valObj
      if (val.$formkit === 'submit' && Array.isArray(val.children)) {
        delete val.children
      }
      const nextKey = typeof val.__key === 'string' && val.__key ? val.__key : generateKey()
      const nextName = val.$formkit === 'submit' ? val.name : generateNextFieldName(existingNames)
      if (val.$formkit === 'submit')
        return { ...valObj, __key: nextKey, outerClass: 'col-span-12 pt-2' }
      // $cmp 节点的语义 name 在 props.name（DSL 回读取 props），顶层 name 仅画布展示，需同步；
      // props.id 同样刷新为 field_<key>，与 $formkit 路径一致（$cmp 字段/静态节点的 id 在 props 内）
      if (typeof val.$cmp === 'string') {
        val.props =
          val.props && typeof val.props === 'object'
            ? { ...val.props, name: nextName, id: `field_${nextKey}` }
            : { name: nextName, id: `field_${nextKey}` }
      }
      // 容器子节点（如 nestedList 内置 group）同样生成唯一 name
      nameChildren(schemaChildren(val))
      // 容器按规格注入各自的身份键（keyProp），不再逐个 kind 硬编码；
      // modelValue 由 children 承载，统一从 props 删除（DSL 往返经 CONTAINER_INTERNAL_PROPS 剥离）
      const spec = getContainerSpec(val.$cmp ?? val.$formkit)
      if (spec && spec.primitive === 'cmp') {
        const props = { ...val.props, [spec.keyProp]: nextKey }
        delete props.modelValue
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
  const parentEl = insertState.insertPoint?.parent?.el
  const axis = parentEl?.getAttribute('data-dnd-axis')
  const isInputGroup = Boolean(parentEl?.getAttribute('data-input-group-key'))
  if (axis === 'x' && !isInputGroup) return

  if (isVertical) {
    insertValues.forEach((val, i) => {
      insertValues[i] = setColSpan(val, 12)
    })
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
    insertValues.forEach((val, i) => {
      insertValues[i] = setColSpan(val, 12)
    })
    return
  }

  const currentCount = targetRow.items.length
  const addedCount = insertValues.length
  const totalCount = currentCount + addedCount

  if (totalCount <= 4) {
    const newSpan = 12 / totalCount
    // targetRow.items 里的元素与 targetParentValues 同下标区间一一对应（getVisualRows
    // 按下标顺序累积），直接改 targetParentValues 的下标，让 setColSpan 的结果真正
    // 传播回调用方后续会用到的那份数组（remaining / nextTargetValues），而不是只改一份
    // 用完即弃的 items 视图
    for (let i = targetRow.startIndex; i <= targetRow.endIndex; i++) {
      targetParentValues[i] = setColSpan(targetParentValues[i], newSpan)
    }
    insertValues.forEach((val, i) => {
      insertValues[i] = setColSpan(val, newSpan)
    })
  } else {
    insertValues.forEach((val, i) => {
      insertValues[i] = setColSpan(val, 3)
    })
  }
}

// 处理 dragEnd：根据 insertState 决定最终插入位置，并提交到 schema 历史。
// 泛型固定为 SchemaNode：画布 DnD 搬运的值本来就是 schema 节点，各调用方传入的
// DragState<FormKitSchemaFormKit> 等与 DragState<SchemaNode> 结构上双向兼容（见
// utils/schema/types.ts 顶部说明），不需要在这里保留 <T> 泛型再逐处 as any 收窄。
export function handleEnd(
  state: DragState<SchemaNode> | SynthDragState<SchemaNode> | BaseDragState<SchemaNode>,
) {
  if (!isDragState(state) && !isSynthDragState(state)) return

  const insertPoint = insertState.insertPoint
  const sourceParent = state.initialParent
  const resolveTargetParent = (): ParentRecord<SchemaNode> => {
    const byInsertState = insertState.draggedOverParent as ParentRecord<SchemaNode> | null
    if (byInsertState?.el && parents.get(byInsertState.el)) return byInsertState

    // isDragState/isSynthDragState 已经把 state 收窄为 DragState | SynthDragState，
    // 两者都携带 DragStateProps（含 coordinates），无需再断言
    const coords = state.coordinates
    if (coords.x === undefined || coords.y === undefined) return state.currentParent
    const clientX = coords.x - (window.scrollX || document.documentElement.scrollLeft)
    const clientY = coords.y - (window.scrollY || document.documentElement.scrollTop)

    const el = document.elementFromPoint(clientX, clientY)
    let current = el instanceof HTMLElement ? el : null
    while (current) {
      const data = parents.get(current)
      if (data) {
        const candidate: ParentRecord<SchemaNode> = { el: current, data }
        // 目标容器配置了 accepts 但拒绝了被拖节点（如按钮组只收按钮）：
        // 不能直接落入该容器，继续向上找下一个可接收的父级（通常是根 drop-area）
        const accepts = data.config.accepts
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

  // 所属画布实例的 DnD 上下文：每个画布 drop-zone（根 / 容器）都由 customInsertPlugin
  // 挂上所属实例的 dndContext（见 plugin.ts）。目标 parent 一定在某个画布内，
  // 走到 ctx 为空说明有 drop-zone 漏挂了——宁可放弃本次提交并报错，也不能静默写进别的实例。
  const ctx = (targetParent.data.config as DndParentConfig<SchemaNode>).dndContext
  if (!ctx) {
    console.error('[formkit-form-builder][dnd] 目标 drop-zone 缺少 dndContext，本次拖放提交已忽略')
  }
  const schemaForNames = ctx?.formSchema.value ?? []

  const sourceListKey = getContainerKey(sourceParent.el)
  const targetListKey = getContainerKey(targetParent.el)

  const draggedValues = state.draggedNodes.map((node) => node.data.value)
  const draggedKeys = new Set<string>()
  for (const v of draggedValues) {
    const k = v?.__key
    if (typeof k === 'string' && k) draggedKeys.add(k)
  }

  const isSource = sourceParent.el.getAttribute('data-is-source') === 'true'

  const sourceValues = parentValues(sourceParent.el, sourceParent.data)
  const targetValues = parentValues(targetParent.el, targetParent.data)

  const draggedOverNode = insertState.draggedOverNodes[0] as NodeRecord<SchemaNode> | undefined
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
      ? sourceParent.data.config.insertConfig.dynamicValues({
          sourceParent,
          targetParent,
          draggedNodes: state.draggedNodes,
          targetNodes: insertState.draggedOverNodes as NodeRecord<SchemaNode>[],
          targetIndex: index,
        })
      : draggedValues

  const insertValues = normalizeInsertValues(insertValuesRaw, isSource, schemaForNames)

  let sourceNextValues: SchemaNode[] | null = null
  let targetNextValues: SchemaNode[] | null = null

  if (sourceParent.el === targetParent.el) {
    const remaining = sourceValues.filter((v) => {
      const k = v?.__key
      if (typeof k === 'string' && k) return !draggedKeys.has(k)
      return !draggedValues.some((y) => eq(v, y))
    })

    const removedBefore = state.draggedNodes.filter((n) => n.data.index < index).length
    const nextIndex = Math.max(0, Math.min(remaining.length, index - removedBefore))

    if (draggedOverNode) {
      adjustColSpansForInsert(
        remaining,
        draggedOverNode.data.value,
        insertValues,
        insertState.verticalInsert ?? false,
      )
    } else {
      insertValues.forEach((val, i) => {
        insertValues[i] = setColSpan(val, 12)
      })
    }

    remaining.splice(nextIndex, 0, ...insertValues)
    // ctx 缺失时不写 DnD 内部列表值：commit 已被跳过，写了也不会被最终 DSL 覆盖，
    // 会让画布视觉状态与真源永久错位（比什么都不做更糟）。
    if (ctx) {
      setParentValues(sourceParent.el, sourceParent.data, [...remaining])
      sourceNextValues = remaining
    }
  } else {
    // ── steps 向导拖入特判 ────────────────────────────────────────────────────
    // 全局唯一：表单中已有 steps 或目标不是根画布时直接阻止，不写任何数据；
    // 合法时把根现有元素整体移入第一个 step，根 children 替换为单个 steps 节点。
    const isStepsDrop = isSource && insertValues.length === 1 && insertValues[0]?.$cmp === 'steps'

    // 步骤向导存在时，根画布独占拖放区：任何非 steps 元素都不能落到根（只能拖进 step 内部）。
    // 悬停高亮已由根 drop-area 的 accepts 拦截（见 use-canvas-schema），这里兜底阻断提交。
    if (!isStepsDrop && isRootDropArea(targetParent.el) && schemaContainsSteps(schemaForNames)) {
      abortDrop(state)
      return
    }

    if (isStepsDrop) {
      if (schemaContainsSteps(schemaForNames) || !isRootDropArea(targetParent.el)) {
        abortDrop(state)
        return
      }
      const stepsNode = insertValues[0]!
      const panes = schemaChildren(stepsNode).length
        ? schemaChildren(stepsNode)
        : [createStepsPane()]
      const firstPane = panes[0]!
      firstPane.children = targetValues.map((v) => ({ ...v }))
      const rootNext: SchemaNode[] = [
        {
          ...stepsNode,
          children: panes,
          props: { ...stepsNode.props, modelValue: panes },
        },
      ]
      // 同上：ctx 缺失时不写 DnD 内部列表值，避免与被跳过的提交永久错位。
      if (ctx) {
        setParentValues(targetParent.el, targetParent.data, rootNext)
        targetNextValues = rootNext
      }
    } else {
      if (!isSource) {
        const remaining = sourceValues.filter((v) => {
          const k = v?.__key
          if (typeof k === 'string' && k) return !draggedKeys.has(k)
          return !draggedValues.some((y) => eq(v, y))
        })
        if (ctx) {
          setParentValues(sourceParent.el, sourceParent.data, [...remaining])
          sourceNextValues = remaining
        }
      }

      const nextTargetValues = [...targetValues]

      // 调色板拖入的新元素保留定义里的 outerClass（模板宽度），不做行内重排/强制 12；
      // 仅对画布内已有元素移动做 col-span 调整，避免覆盖模板默认宽度。
      if (!isSource) {
        if (draggedOverNode) {
          adjustColSpansForInsert(
            nextTargetValues,
            draggedOverNode.data.value,
            insertValues,
            insertState.verticalInsert ?? false,
          )
        } else {
          insertValues.forEach((val, i) => {
            insertValues[i] = setColSpan(val, 12)
          })
        }
      }

      nextTargetValues.splice(index, 0, ...insertValues)
      if (ctx) {
        setParentValues(targetParent.el, targetParent.data, [...nextTargetValues])
        targetNextValues = nextTargetValues
      }
    }
  }

  // 从目标向上找所属画布根（多实例时各自作用域，不再全局 querySelector）。
  const rootEl = findRootDropAreaEl(targetParent.el)
  const rootData = rootEl ? parents.get(rootEl) : undefined
  if (!rootEl || !rootData) return

  let rootValues: SchemaNode[] = parentValues(rootEl, rootData)
  if (rootEl === sourceParent.el && sourceNextValues) rootValues = sourceNextValues
  if (rootEl === targetParent.el && targetNextValues) rootValues = targetNextValues

  const listMap = new Map<string, SchemaNode[]>()
  const listEls = Array.from(
    rootEl.querySelectorAll<HTMLElement>(
      '[data-list-key],[data-card-key],[data-input-group-key],[data-button-group-key],[data-badge-key],[data-tabs-key],[data-tabs-pane-key],[data-steps-key],[data-steps-pane-key],[data-group-key]',
    ),
  )
  for (const el of listEls) {
    const key = getContainerKey(el)
    if (!key) continue
    const data = parents.get(el)
    if (!data) continue
    let vals: SchemaNode[] = parentValues(el, data)
    if (sourceListKey && key === sourceListKey && sourceNextValues && sourceParent.el !== rootEl) {
      vals = sourceNextValues
    }
    if (targetListKey && key === targetListKey && targetNextValues && targetParent.el !== rootEl) {
      vals = targetNextValues
    }
    const cleaned = vals.map((v) => {
      if (v?.$formkit === 'submit' && Array.isArray(v.children)) {
        const next = { ...v }
        delete next.children
        return next
      }
      return v
    })
    listMap.set(key, cleaned)
  }

  const applyListMap = (node: SchemaNode): SchemaNode => {
    if (!node || typeof node !== 'object') return node
    if (node.$formkit === 'submit' && Array.isArray(node.children)) {
      const next = { ...node }
      delete next.children
      return next
    }

    const key = node.__key
    let next: SchemaNode = node

    if (typeof key === 'string' && key && listMap.has(key)) {
      const rawChildren = listMap.get(key) ?? []
      const isInputGroup = node.$formkit === 'inputGroup' || node.$cmp === 'inputGroup'
      const isButtonGroup = node.$formkit === 'buttonGroup' || node.$cmp === 'buttonGroup'
      const children = isInputGroup
        ? normalizeInputGroupChildren(rawChildren)
        : isButtonGroup
          ? rawChildren.map((c) => stripInputGroupOuterClass(c))
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
      const nextChildren = schemaChildren(next).map((c) => applyListMap(c))
      next = { ...next, children: nextChildren }
    }
    return next
  }

  const nextSchema = rootValues.map((node) => applyListMap(node))

  // 用所属画布实例的提交漏斗写回；ctx 缺失时前面已跳过所有 setParentValues 写入，
  // rootValues 仍是未变更的真实值，这里再跳过提交不会造成状态错位，只是整次拖放被忽略。
  if (ctx) ctx.commitSchemaReconcile(nextSchema, { reason: 'dnd' })

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
