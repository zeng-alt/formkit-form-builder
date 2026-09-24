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
import { handleEnd } from './commit'
import { insertState } from './insert-state'
import { positionInsertPoint, createInsertPoint, hideInsertBadge } from './insert-point'
import { isRootDropArea, type DndContext, type DndParentConfig } from './context'
import { defineRanges, type InsertRange, type InsertRangeData } from './range'
import { eventCoordinates, pd } from '../utils'
import type { SchemaNode } from '@/utils/schema/types'
import {
  clearHoverFeedback,
  hideContainerHighlight,
  hideRejectBadge,
  showContainerHighlight,
  showRejectBadge,
} from './hover-feedback'
import { stopEdgeAutoScroll, updateEdgeAutoScroll } from './auto-scroll'

let documentController: AbortController | undefined

// 拖动结束（放下 / Esc 取消 / 拖出窗口释放）时的统一清理：解绑 dragStarted 时挂到
// document 上的监听、收起插入徽标与悬停浮层、停止边缘自动滚动。
// 注意 @formkit/drag-and-drop 只在全局 state 上广播 'dragEnded'（handleEnd 末尾的
// state.emit），从不在单个 parent 的 parentData 上触发——挂在 parentData.on('dragEnded')
// 上永远不会执行，浮层会残留在最后一次悬停的容器上、document 监听也会每拖一次多一份。
// 全局 emitter 每注册一次就多一个回调，所以用模块级标记保证只注册一次。
let dragEndedCleanupRegistered = false
function registerDragEndedCleanup() {
  if (dragEndedCleanupRegistered) return
  dragEndedCleanupRegistered = true
  state.on('dragEnded', () => {
    documentController?.abort()
    documentController = undefined
    hideInsertBadge()
    clearHoverFeedback()
    stopEdgeAutoScroll()
  })
}

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

// 找到第一个可滚动父容器，用于滚动时重算命中范围；L4 的边缘自动滚动（本文件内的
// checkPosition）也复用它找“当前指针下的元素往上第一个可滚动容器”，不用另起一套
// 判断逻辑——传给 updateEdgeAutoScroll 而不是让 auto-scroll.ts 反过来 import 这里，
// 避免两个模块相互引用。
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

// 当鼠标移出所有注册的 drop-zone 时隐藏插入提示线；L4 边缘自动滚动挂在这里统一驱动——
// 这是唯一一个不管指针在不在已注册的 drop-zone 上都会持续收到 dragover/pointermove
// 的地方（document 级监听，不要求任何祖先 preventDefault），覆盖靠近边缘但暂时悬停在
// 非放置区域（如画布留白）上的情况。
function checkPosition(e: DragEvent | PointerEvent) {
  if (!isDragState(state)) return

  updateEdgeAutoScroll(e.clientX, e.clientY, findFirstOverflowingParent)

  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!(el instanceof HTMLElement) || el === insertState.insertPoint?.el) {
    if (insertState.insertPoint) insertState.insertPoint.el.style.display = 'none'
    hideInsertBadge()
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
    hideInsertBadge()
    if (insertState.draggedOverParent) {
      removeClass(
        [insertState.draggedOverParent.el],
        insertState.draggedOverParent.data.config.dropZoneClass,
      )
    }
    insertState.draggedOverNodes = []
    insertState.draggedOverParent = null
    state.currentParent = state.initialParent
    // L2/L3：离开所有已注册的放置区（比如悬停到侧边栏、顶栏留白）时，容器高亮标签
    // 与拒绝反馈徽标也一并收起，不留在屏幕上无意义地跟着指针漂移
    clearHoverFeedback()
  }
}

function handleNodeDragover<T>(data: NodeDragEventData<T>) {
  const config = data.targetData.parent.data.config
  if (!config.nativeDrag) return
  data.e.preventDefault()
}

const throttledMoveBetween = throttle(moveBetween)

type AcceptsFn<T> = (
  target: ParentRecord<T>,
  initial: ParentRecord<T>,
  current: ParentRecord<T>,
  state: DragState<T>,
) => boolean

// L2/L3：容器高亮标签 + 不可放置反馈。每次命中一个 parent（不管是不是最终会
// moveBetween/moveOutside 决定的落点）都刷新一遍——与那两个函数各自的排序/跨容器
// 提交逻辑分开维护：这里只管悬停时的视觉反馈，用同一份 accepts 结果各自独立消费，
// 不会互相影响对方已经稳定跑通的落点计算。
function updateHoverFeedback<T>(
  e: DragEvent | PointerEvent,
  target: ParentRecord<T>,
  dragState: DragState<T>,
) {
  const config = target.data.config as DndParentConfig<T>
  const acceptsFn = config.accepts as AcceptsFn<T> | undefined

  let accepted = true
  if (typeof acceptsFn === 'function') {
    try {
      accepted = acceptsFn(target, dragState.initialParent, dragState.currentParent, dragState)
    } catch {
      // 校验异常时放行，保持与 moveBetween 一致的兜底行为
      accepted = true
    }
  }

  // 原生拖拽的光标图标由 dropEffect 驱动（CSS cursor 在原生 DnD 期间不生效）：
  // 拒绝时设为 'none'，浏览器自动画出 not-allowed 的圆斜杠光标
  if (e instanceof DragEvent && e.dataTransfer) {
    e.dataTransfer.dropEffect = accepted ? config.dragDropEffect : 'none'
  }

  const ctx = config.dndContext

  if (!accepted) {
    hideContainerHighlight()
    // moveBetween/moveOutside 在 accepts 为 false 时提前 return，不会再帮忙更新/
    // 隐藏插入线——留着上一次成功命中时的插入线和宽度徽标会显得"还能插进去"，
    // 这里主动收起，和红色徽标、not-allowed 光标保持一致
    if (insertState.insertPoint) insertState.insertPoint.el.style.display = 'none'
    hideInsertBadge()
    const title = ctx?.t?.('dnd.reject.notAllowed') ?? '不能放在这里'
    showRejectBadge(e.clientX, e.clientY, title, ctx?.describeRejection?.())
    return
  }

  hideRejectBadge()
  const name = ctx?.containerLabel?.()
  if (name && ctx?.t) showContainerHighlight(target.el, ctx.t('dnd.dropInto', { name }))
  else hideContainerHighlight()
}

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

  updateHoverFeedback(e, realTargetParent, state)

  defineRanges(realTargetParent.el)

  if (realTargetParent.el === state.currentParent?.el) {
    throttledMoveBetween(realTargetParent, state)
  } else {
    moveOutside(realTargetParent, state)
  }

  state.currentParent = realTargetParent
}

function handleParentDragover<T>(data: ParentEventData<T>, state: DragState<T>) {
  processParentDragEvent(data.e as DragEvent, data.targetData, state, true)
}

function handleParentPointerover<T>(data: PointeroverParentEvent<T>) {
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
  // node.data.range 的库类型是 { ascending?, descending? }，实际存的是本仓库自定义的
  // 四向命中范围（见 range.ts 的 InsertRangeData 说明）
  const range = foundRange[0].data.range as InsertRangeData | undefined
  const position = range?.[key]
  if (!position) return

  insertState.verticalInsert = key === 'top' || key === 'bottom'

  positionInsertPoint(
    data,
    position,
    key === 'right' || key === 'bottom',
    foundRange[0],
    insertState,
  )
}

// 在一个 parent 内移动（排序）
function moveBetween<T>(data: ParentRecord<T>, state: DragState<T>) {
  if (data.data.config.sortable === false) return

  // 单元素容器（list / badge 等）：容器已满时 accepts 会拒绝新元素，但拖入瞬间
  // currentParent 已被置为该容器，后续内部移动走 moveBetween（不 consult accepts），
  // 导致内层元素上出现"可插入"的辅助拖拽线。这里同样按 accepts 拦截，满时不再显示插入线。
  const accepts = data.data.config.accepts as
    | ((
        target: ParentRecord<T>,
        initial: ParentRecord<T>,
        current: ParentRecord<T>,
        state: DragState<T>,
      ) => boolean)
    | undefined
  if (typeof accepts === 'function') {
    try {
      if (!accepts(data, state.initialParent, state.currentParent, state)) return
    } catch {
      // 校验异常时放行，保持既有行为
    }
  }

  insertState.draggedRowSpan = Math.max(
    1,
    // T 是插件系统的形参，运行时搬运的值始终是 schema 节点（见 commit.ts 顶部说明）
    ...state.draggedNodes.map((n) => {
      const outerClass = (n.data.value as SchemaNode | undefined)?.outerClass
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
    // insertState 是跨画布实例共享的单例，固定为 InsertState<unknown>（不跟随调用方的 T），
    // data 这里按同一约定收窄成 ParentRecord<unknown>，和 insertState.draggedOverParent 的
    // 赋值（上面几行）用的是同一个模式
    if (!insertState.insertPoint) createInsertPoint(data as ParentRecord<unknown>, insertState)
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
        const outerClass = (n.data.value as SchemaNode | undefined)?.outerClass
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
    // 同 handleInsertBasedOnRange：range 是本仓库自定义的四向命中范围，非库自己的类型
    const nodeRange = node.data.range as InsertRangeData
    const inRange = (range: InsertRange) =>
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
    hideInsertBadge()
  }

  return foundRange
}

// 对外暴露：在画布 DnD 里作为插件传入。deps 为所属画布实例的 DnD 上下文，
// 挂到该 parent 的 config 上，供提交（handleEnd）与插入定位（positionInsertPoint）运行时读取。
// 参数必传、不允许省略：画布 drop-zone（根 / 容器）必须传真实上下文，省略等于让该 drop-zone
// 的拖放静默失败（见 commit.ts 的 ctx 缺失分支）；纯拖拽源（左侧调色板，不属于任何画布、
// 从不作为落点）显式传 null——提交时 ctx 一律从落点 parent 读取，不会用到拖拽源的上下文，
// 传 null 比造一个 no-op 假上下文更诚实，也不会把"静默什么都不做"重新引回来。
export function customInsertPlugin<T>(insertConfig: InsertConfig<T>, deps: DndContext | null) {
  return (parent: HTMLElement) => {
    const parentData = parents.get(parent)
    if (!parentData) return

    const insertParentConfig = {
      ...parentData.config,
      insertConfig,
      dndContext: deps ?? undefined,
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
          // customInsertPlugin 只用于画布 DnD，搬运的值始终是 schema 节点；这里的 <T> 是
          // @formkit/drag-and-drop 插件系统的形参，commit.ts 的 handleEnd 把值固定为
          // SchemaNode（见该文件顶部说明），两者对同一批运行时数据的类型描述不同，故需
          // 断言，但断言目标是具体类型而非 any
          handleEnd(state as DragState<SchemaNode> | SynthDragState<SchemaNode>)
          originalHandleEnd(state)
        }

        parentData.on('dragStarted', () => {
          documentController?.abort()
          documentController = addEvents(document, {
            dragover: throttle(checkPosition),
            pointermove: throttle(checkPosition),
          })
        })

        registerDragEndedCleanup()

        parentData.config = insertParentConfig

        state.on('dragStarted', () => {
          defineRanges(parent)
        })

        // 根 drop-area：把所属画布的 formSchema 投影同步为父级列表值。
        // 多实例时每个画布根用各自实例的投影，testid 以 drop-area 开头即根。
        if (deps && isRootDropArea(parent)) {
          watch(
            deps.formSchema,
            (newSchema) => {
              if (newSchema) {
                setParentValues(parent, parentData, [...newSchema])
              }
            },
            // 不需要 deep：formSchema 是不可变投影，任何改动都会产出新的根数组引用；
            // deep 会在每次编辑时把整棵 schema 遍历一遍
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
