import type {
  DragState,
  InsertConfig,
  Node,
  NodeDragEventData,
  NodeRecord,
  ParentEventData,
  ParentRecord,
  PointeroverParentEvent,
  SynthDragState,
} from '@formkit/drag-and-drop'
import {
  addEvents,
  addParentClass,
  isDragState,
  nodes,
  parents,
  removeClass,
  setParentValues,
  state,
} from '@formkit/drag-and-drop'
import { watch } from 'vue'
import { formSchema } from '@/state/form-schema'
import { handleEnd } from './commit'
import { insertState } from './insert-state'
import { positionInsertPoint, createInsertPoint } from './insert-point'
import { defineRanges } from './range'
import { eventCoordinates, pd } from '../utils'

let documentController: AbortController | undefined

// Safari 在高频 moveBetween 时容易抖动，这里做简单节流
const throttle = (fn: (...args: any[]) => void) => {
  const delay = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ? 100 : 0
  let timerFlag: ReturnType<typeof setTimeout> | null = null
  return (...args: any[]) => {
    if (timerFlag === null) {
      fn(...args)
      timerFlag = setTimeout(() => {
        timerFlag = null
      }, delay)
    }
  }
}

// 找到第一个可滚动父容器，用于滚动时重算命中范围
function findFirstOverflowingParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement
  while (parent) {
    const { overflow, overflowY, overflowX } = getComputedStyle(parent)
    const isOverflowSet =
      overflow !== 'visible' || overflowY !== 'visible' || overflowX !== 'visible'
    const isOverflowing =
      parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth
    const hasScrollPosition = parent.scrollTop > 0 || parent.scrollLeft > 0
    if (isOverflowSet && (isOverflowing || hasScrollPosition)) return parent
    parent = parent.parentElement
  }
  return null
}

// 当鼠标移出所有注册的 drop-zone 时隐藏插入提示线
function checkPosition(e: DragEvent | PointerEvent) {
  if (!isDragState(state)) return

  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!(el instanceof HTMLElement) || el === insertState.insertPoint?.el) {
    if (insertState.insertPoint) insertState.insertPoint.el.style.display = 'none'
    return
  }

  let isWithinAParent = false
  let current: HTMLElement | null = el
  while (current) {
    if (nodes.has(current as Node) || parents.has(current)) {
      isWithinAParent = true
      break
    }
    if (current === document.body) break
    current = current.parentElement
  }

  if (!isWithinAParent) {
    if (insertState.insertPoint) insertState.insertPoint.el.style.display = 'none'
    if (insertState.draggedOverParent) {
      removeClass(
        [insertState.draggedOverParent.el],
        insertState.draggedOverParent.data.config.dropZoneClass,
      )
    }
    insertState.draggedOverNodes = []
    insertState.draggedOverParent = null
    state.currentParent = state.initialParent
  }
}

export function handleNodeDragover<T>(data: NodeDragEventData<T>) {
  const config = data.targetData.parent.data.config
  if (!config.nativeDrag) return
  data.e.preventDefault()
}

const throttledMoveBetween = throttle(moveBetween)

function processParentDragEvent<T>(
  e: DragEvent | PointerEvent,
  targetData: ParentEventData<T>['targetData'],
  state: DragState<T>,
  nativeDrag = false,
) {
  pd(e)
  if (nativeDrag && e instanceof PointerEvent) return

  const { x, y } = eventCoordinates(e)

  const scrollLeft = window.scrollX || document.documentElement.scrollLeft
  const scrollTop = window.scrollY || document.documentElement.scrollTop

  state.coordinates.x = x + scrollLeft
  state.coordinates.y = y + scrollTop

  const nestedParent = targetData.parent.data.nestedParent
  let realTargetParent = targetData.parent

  if (nestedParent) {
    const rect = nestedParent.el.getBoundingClientRect()
    if (state.coordinates.y > rect.top && state.coordinates.y < rect.bottom)
      realTargetParent = nestedParent
  }

  defineRanges(realTargetParent.el)

  if (realTargetParent.el === state.currentParent?.el) {
    throttledMoveBetween(realTargetParent, state)
  } else {
    moveOutside(realTargetParent, state)
  }

  state.currentParent = realTargetParent
}

export function handleParentDragover<T>(data: ParentEventData<T>, state: DragState<T>) {
  processParentDragEvent(data.e as DragEvent, data.targetData, state, true)
}

export function handleParentPointerover<T>(data: PointeroverParentEvent<T>) {
  const { detail } = data
  const { state, targetData } = detail
  if (state.scrolling) return
  processParentDragEvent(detail.e, targetData, state)
}

function handleInsertBasedOnRange<T>(
  foundRange: [NodeRecord<any>, string] | null,
  data: ParentRecord<T>,
) {
  if (!foundRange) return

  const key = foundRange[1] as 'left' | 'right' | 'top' | 'bottom'
  const position = foundRange[0].data.range ? (foundRange[0].data.range as any)[key] : undefined
  if (!position) return

  insertState.verticalInsert = key === 'top' || key === 'bottom'

  positionInsertPoint(
    data,
    position,
    key === 'right' || key === 'bottom',
    foundRange[0],
    insertState as any,
  )
}

// 在一个 parent 内移动（排序）
export function moveBetween<T>(data: ParentRecord<T>, state: DragState<T>) {
  if (data.data.config.sortable === false) return

  insertState.draggedRowSpan = Math.max(
    1,
    ...state.draggedNodes.map((n) => {
      const outerClass = (n.data as any)?.value?.outerClass
      if (typeof outerClass !== 'string') return 1
      const match = outerClass.match(/\brow-span-(\d+)\b/)
      const parsed = match ? parseInt(match[1]!, 10) : 1
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
    }),
  )

  const values = data.data.getValues(data.el)
  if (values.length === 0) {
    insertState.draggedOverParent = data as ParentRecord<unknown>
    addParentClass([data.el], data.data.config.dropZoneClass)
    if (!insertState.insertPoint) createInsertPoint(data, insertState as any)
    if (insertState.insertPoint) {
      const rect = data.el.getBoundingClientRect()
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const axis = data.el.getAttribute('data-dnd-axis')
      const onlyX = axis === 'x'
      Object.assign(insertState.insertPoint.el.style, {
        position: 'absolute',
        display: 'block',
        top: onlyX
          ? `${rect.top + scrollTop}px`
          : `${rect.top + rect.height / 2 + scrollTop - 2}px`,
        left: onlyX
          ? `${rect.left + rect.width / 2 + scrollLeft - 2}px`
          : `${rect.left + scrollLeft}px`,
        width: onlyX ? '4px' : `${rect.width}px`,
        height: onlyX ? `${rect.height}px` : '4px',
        transform: '',
      })
    }
    insertState.verticalInsert = data.el.getAttribute('data-dnd-axis') === 'x' ? false : true
    insertState.targetIndex = 0
    insertState.ascending = true
    return
  }

  if (
    data.el === insertState.draggedOverParent?.el &&
    insertState.draggedOverParent.data.getValues(data.el).length === 0
  ) {
    return
  } else if (insertState.draggedOverParent?.el) {
    removeClass(
      [insertState.draggedOverParent.el],
      insertState.draggedOverParent.data.config.dropZoneClass,
    )
    insertState.draggedOverParent = null
  }

  const foundRange = findClosest(data.data.enabledNodes, state)
  handleInsertBasedOnRange(foundRange, data)
}

function moveOutside<T>(data: ParentRecord<T>, state: DragState<T>) {
  if (data.el === state.currentParent.el) return false

  const targetConfig = data.data.config

  if (state.draggedNode.el.contains(data.el)) return false
  if (targetConfig.dropZone === false) return

  const initialParentConfig = state.initialParent.data.config

  if (targetConfig.accepts) {
    return targetConfig.accepts(data, state.initialParent, state.currentParent, state)
  } else if (!targetConfig.group || targetConfig.group !== initialParentConfig.group) {
    return false
  }

  const values = data.data.getValues(data.el)

  if (!values.length) {
    if (insertState.draggedOverParent?.el && insertState.draggedOverParent.el !== data.el) {
      removeClass(
        [insertState.draggedOverParent.el],
        insertState.draggedOverParent.data.config.dropZoneClass,
      )
    }
    addParentClass([data.el], targetConfig.dropZoneClass)
    insertState.draggedOverParent = data as ParentRecord<unknown>
    const insertPoint = insertState.insertPoint
    if (insertPoint) insertPoint.el.style.display = 'none'
  } else {
    removeClass([state.currentParent.el], targetConfig.dropZoneClass)
    if (insertState.draggedOverParent?.el) {
      removeClass(
        [insertState.draggedOverParent.el],
        insertState.draggedOverParent.data.config.dropZoneClass,
      )
      insertState.draggedOverParent = null
    }
    insertState.draggedRowSpan = Math.max(
      1,
      ...state.draggedNodes.map((n) => {
        const outerClass = (n.data as any)?.value?.outerClass
        if (typeof outerClass !== 'string') return 1
        const match = outerClass.match(/\brow-span-(\d+)\b/)
        const parsed = match ? parseInt(match[1]!, 10) : 1
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
      }),
    )
    const foundRange = findClosest(data.data.enabledNodes, state)
    handleInsertBasedOnRange(foundRange, data)
  }
}

// 找到当前鼠标坐标命中的 drop-range（left/right/top/bottom）
function findClosest<T>(enabledNodes: NodeRecord<T>[], state: DragState<T>) {
  if (state.coordinates?.x === undefined || state.coordinates?.y === undefined) return null
  let foundRange: [NodeRecord<T>, string] | null = null

  for (let x = 0; x < enabledNodes.length; x++) {
    const node = enabledNodes[x]
    if (!node || !node.data.range) continue
    const nodeRange = node.data.range as any
    const inRange = (range: any) =>
      state.coordinates.y > range.y[0]! &&
      state.coordinates.y < range.y[1]! &&
      state.coordinates.x > range.x[0]! &&
      state.coordinates.x < range.x[1]!

    if (nodeRange?.left && inRange(nodeRange.left)) {
      foundRange = [node, 'left']
      break
    }
    if (nodeRange?.right && inRange(nodeRange.right)) {
      foundRange = [node, 'right']
      break
    }
    if (nodeRange?.top && inRange(nodeRange.top)) {
      foundRange = [node, 'top']
      break
    }
    if (nodeRange?.bottom && inRange(nodeRange.bottom)) {
      foundRange = [node, 'bottom']
      break
    }
  }

  if (insertState.insertPoint && state.initialParent?.el !== state.currentParent?.el) {
    insertState.insertPoint.el.style.display = 'none'
  }

  return foundRange
}

// 对外暴露：在画布 DnD 里作为插件传入
export function customInsertPlugin<T>(insertConfig: InsertConfig<T>) {
  return (parent: HTMLElement) => {
    const parentData = parents.get(parent)
    if (!parentData) return

    const insertParentConfig = {
      ...parentData.config,
      insertConfig,
    }

    return {
      setup() {
        insertParentConfig.handleNodeDragover =
          insertConfig.handleNodeDragover || handleNodeDragover
        insertParentConfig.handleParentPointerover =
          insertConfig.handleParentPointerover || handleParentPointerover
        insertParentConfig.handleNodePointerover =
          insertConfig.handleNodePointerover || handleParentPointerover
        insertParentConfig.handleParentDragover =
          insertConfig.handleParentDragover || handleParentDragover

        const originalHandleEnd = insertParentConfig.handleEnd
        insertParentConfig.handleEnd = (state: DragState<T> | SynthDragState<T>) => {
          handleEnd(state as any)
          originalHandleEnd(state)
        }

        parentData.on('dragStarted', () => {
          documentController = addEvents(document, {
            dragover: throttle(checkPosition),
            pointermove: throttle(checkPosition),
          })
        })

        parentData.on('dragEnded', () => {
          documentController?.abort()
        })

        parentData.config = insertParentConfig

        state.on('dragStarted', () => {
          defineRanges(parent)
        })

        if (parent.getAttribute('data-testid') === 'drop-area') {
          watch(
            formSchema,
            (newSchema) => {
              if (newSchema) {
                setParentValues(parent, parentData, [...newSchema])
              }
            },
            { deep: true },
          )
        }

        state.on('scrollStarted', () => {
          if (insertState.insertPoint) insertState.insertPoint.el.style.display = 'none'
        })

        state.on('scrollEnded', () => {
          defineRanges(parent)
        })

        const firstScrollableParent = findFirstOverflowingParent(parent)
        if (firstScrollableParent)
          firstScrollableParent.addEventListener('scroll', defineRanges.bind(null, parent))

        window.addEventListener('resize', defineRanges.bind(null, parent))
      },
    }
  }
}
