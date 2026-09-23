import type { DragState, NodeRecord, ParentRecord } from '@formkit/drag-and-drop'
import { state } from '@formkit/drag-and-drop'
import { findSchemaByKey } from './schema'
import { computePlacements, findInsertIndexForCell, getRowSpan } from './grid'
import { getRealCoords } from './range'
import type { DndParentConfig } from './context'
import type { InsertStateEx } from './insert-state'
import { computeGridInsertBadgeInfo, type GridInsertDirection } from './grid-insert'
import { formatGridInsertBadge } from './insert-badge'
import type { SchemaNode } from '@/utils/schema/types'

// ═══ L1：插入线旁的宽度徽标 ═══════════════════════════════════════════════════
// 单例浮层，跟插入线一样挂在 body 下、绝对定位；不随 createInsertPoint/removeInsertPoint
// 的每次换 parent 重建——它没有 parent 相关的样式（data-insert-bg 之类），复用一个
// 节点更省事，drag 结束时和插入线一起隐藏即可（见 plugin.ts 的 dragEnded 清理，
// 这里额外提供 hideInsertBadge 给 commit.ts 的 abortDrop 场景调用）。
let insertBadgeEl: HTMLDivElement | null = null

function ensureInsertBadge(): HTMLDivElement {
  if (insertBadgeEl) return insertBadgeEl
  const el = document.createElement('div')
  el.setAttribute('data-dnd-overlay', 'insert-badge')
  Object.assign(el.style, {
    position: 'absolute',
    display: 'none',
    pointerEvents: 'none',
    zIndex: '2001',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#a277ff',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
  })
  document.body.appendChild(el)
  insertBadgeEl = el
  return el
}

export function hideInsertBadge() {
  if (insertBadgeEl) insertBadgeEl.style.display = 'none'
}

/**
 * 算出徽标文案：J 的纯函数（computeGridInsertBadgeInfo，内部直接复用 computeGridInsert）
 * 算出插入后的宽度信息，这里只负责翻成本地化文案。三种情况下不显示徽标——
 * 都是"预览这里算不准，与其显示错误数字不如不显示"：
 * - 目标容器是 axis:'x' 的横向 row 容器（输入组 / 按钮组），J3 明确不管这类容器；
 * - 没有 dndContext.t（低层工具函数测试等场景，见 context.ts 的可选说明）；
 * - 命中的是 row-span>1 目标的下半段（explicitRow 已算出），提交时走的是完全不同的
 *   adjustColSpansForInsertAtRow 分支，不是 computeGridInsert。
 */
function computeInsertBadgeText<T>(
  parent: ParentRecord<T>,
  node: NodeRecord<T>,
  direction: GridInsertDirection,
  ctx: { t?: (key: string, params?: Record<string, string | number>) => string } | undefined,
): string | null {
  if (!ctx?.t) return null
  if (parent.el.getAttribute('data-dnd-axis') === 'x') return null

  const latestValues = parent.data.getValues(parent.el)
  if (!Array.isArray(latestValues)) return null

  // 同容器内移动：真正提交时（commit.ts 的 remaining）会先把被拖节点从兄弟数组里
  // 摘出去再插入，预览要按同一份"摘掉自己之后"的兄弟数组计算，数字才会对得上
  const dragState = state as DragState<unknown>
  let siblings: unknown[] = latestValues
  if (dragState.initialParent?.el === parent.el && Array.isArray(dragState.draggedNodes)) {
    const draggedKeys = new Set<string>()
    for (const n of dragState.draggedNodes) {
      const k = (n?.data?.value as SchemaNode | undefined)?.__key
      if (typeof k === 'string' && k) draggedKeys.add(k)
    }
    if (draggedKeys.size > 0) {
      siblings = latestValues.filter((v) => {
        const k = (v as SchemaNode | undefined)?.__key
        return !(typeof k === 'string' && k && draggedKeys.has(k))
      })
    }
  }

  const targetIndex = siblings.indexOf(node.data.value)
  if (targetIndex < 0) return null

  const info = computeGridInsertBadgeInfo(siblings, targetIndex, direction)
  if (!info) return null
  return formatGridInsertBadge(info, ctx.t)
}

/**
 * 把徽标放在插入线附近但不遮挡它、也不超出视口：
 * - 纵向插入线（水平摆放）：徽标贴在线的正上方，放不下就贴到下方；
 * - 横向插入线（竖直摆放）：徽标贴在线的右侧，放不下就贴到左侧。
 * 入参都是"页面坐标"（含滚动偏移，与 insertPointEl 自己的定位方式一致），
 * 视口裁剪时临时换算回视口坐标比较，再换算回页面坐标赋值。
 */
function positionInsertBadge(
  text: string,
  line: { left: number; top: number; width: number; height: number; vertical: boolean },
) {
  const el = ensureInsertBadge()
  el.textContent = text
  el.style.display = 'block'

  const scrollLeft = window.scrollX || document.documentElement.scrollLeft
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const badgeRect = el.getBoundingClientRect()
  const gap = 6

  let viewportLeft: number
  let viewportTop: number

  if (line.vertical) {
    // 插入线是水平摆放的一条细线（纵向插入）：徽标贴在线的正上方，居中对齐线的左端附近
    viewportLeft = line.left - scrollLeft
    viewportTop = line.top - scrollTop - badgeRect.height - gap
    if (viewportTop < 0) viewportTop = line.top - scrollTop + line.height + gap
  } else {
    // 插入线是竖直摆放的一条细线（横向插入）：徽标贴在线的右侧，垂直居中对齐线的顶端附近
    viewportLeft = line.left - scrollLeft + line.width + gap
    viewportTop = line.top - scrollTop
    if (viewportLeft + badgeRect.width > window.innerWidth) {
      viewportLeft = line.left - scrollLeft - badgeRect.width - gap
    }
  }

  viewportLeft = Math.max(4, Math.min(viewportLeft, window.innerWidth - badgeRect.width - 4))
  viewportTop = Math.max(4, Math.min(viewportTop, window.innerHeight - badgeRect.height - 4))

  Object.assign(el.style, {
    left: `${viewportLeft + scrollLeft}px`,
    top: `${viewportTop + scrollTop}px`,
  })
}

// 创建插入提示线 DOM
export function createInsertPoint<T>(parent: ParentRecord<T>, insertState: InsertStateEx<T>) {
  const insertPoint = parent.data.config.insertConfig?.insertPoint({
    el: parent.el,
    data: parent.data,
  })

  if (!insertPoint) throw new Error('Insert point not found')

  insertState.insertPoint = {
    parent,
    el: insertPoint,
  }

  document.body.appendChild(insertPoint)

  Object.assign(insertPoint.style, {
    position: 'absolute',
    display: 'none',
  })
}

function removeInsertPoint<T>(insertState: InsertStateEx<T>) {
  if (insertState.insertPoint?.el) insertState.insertPoint.el.remove()
  insertState.insertPoint = null
}

// 根据命中范围定位插入提示线（支持 row-span 的分段提示 + 更精确的插入位置计算）
export function positionInsertPoint<T>(
  parent: ParentRecord<T>,
  position: { x: number[]; y: number[]; vertical: boolean },
  ascending: boolean,
  node: NodeRecord<T>,
  insertState: InsertStateEx<T>,
) {
  // 所属画布实例的 schema 投影：精确插入定位需按最新 DSL 计算 row-span / 占位。
  // 多实例时从目标 parent 的 config 读取各自画布投影，避免读到别的画布。
  const ctx = (parent.data.config as DndParentConfig<T>).dndContext
  const liveSchema = ctx?.formSchema.value ?? []

  if (insertState.insertPoint?.parent.el !== parent.el) {
    removeInsertPoint(insertState)
    createInsertPoint(parent, insertState)
  }

  insertState.draggedOverNodes = [node]
  insertState.targetIndex = node.data.index
  insertState.ascending = ascending

  if (!insertState.insertPoint) return

  insertState.insertPoint.el.style.display = 'block'

  const insertPointEl = insertState.insertPoint.el

  insertState.explicitIndex = undefined
  insertState.explicitRow = undefined

  const resetInsertPointSegments = () => {
    if (insertPointEl.childElementCount) insertPointEl.replaceChildren()
    const bg = insertPointEl.getAttribute('data-insert-bg')
    if (bg) insertPointEl.style.backgroundColor = bg
  }

  if (position.vertical) {
    resetInsertPointSegments()
    const insertPointHeight = insertPointEl.getBoundingClientRect().height || 4
    const targetY = position.y[ascending ? 1 : 0]!
    const topPosition = targetY - insertPointHeight / 2

    Object.assign(insertPointEl.style, {
      top: `${topPosition}px`,
      left: `${position.x[0]!}px`,
      width: `${position.x[1]! - position.x[0]!}px`,
      height: '4px',
      bottom: '',
      right: '',
    })

    // L1：纵向插入（放在上方/下方）的宽度徽标
    const verticalDirection: GridInsertDirection = ascending ? 'bottom' : 'top'
    const verticalBadgeText = computeInsertBadgeText(parent, node, verticalDirection, ctx)
    if (verticalBadgeText) {
      positionInsertBadge(verticalBadgeText, {
        left: position.x[0]!,
        top: topPosition,
        width: position.x[1]! - position.x[0]!,
        height: insertPointHeight,
        vertical: true,
      })
    } else {
      hideInsertBadge()
    }
  } else {
    const insertPointWidth = insertPointEl.getBoundingClientRect().width || 4
    const targetX = position.x[ascending ? 1 : 0]!
    const leftPosition = targetX - insertPointWidth / 2
    const targetHeight = position.y[1]! - position.y[0]!

    const latestValues = parent.data.getValues(parent.el)
    const latestValue =
      Array.isArray(latestValues) && typeof node.data.index === 'number'
        ? latestValues[node.data.index]
        : undefined
    // node.data.value 是插件系统的形参 T，运行时搬运的值始终是 schema 节点
    const targetKey = (node.data.value as SchemaNode | undefined)?.__key
    const schemaValue =
      typeof targetKey === 'string' && targetKey
        ? findSchemaByKey(liveSchema, targetKey)
        : undefined
    const targetRowSpan = getRowSpan(schemaValue ?? latestValue ?? node.data.value)
    const draggedRowSpan = insertState.draggedRowSpan ?? 1
    const shouldSegment = targetRowSpan > 1 && draggedRowSpan === 1

    // 全局单例 state 声明为 BaseDragState<unknown>（没有 coordinates），但插入定位只在
    // dragover 期间触发，此时必然是 DragState/SynthDragState（二者都带 coordinates）；
    // 这里不用 isDragState 再收窄一次（避免引入新分支判断，保持原有的可选链兜底），
    // 直接按更精确的类型断言
    const coords = (state as DragState<unknown>).coordinates
    if (targetRowSpan > 1 && typeof node.data.index === 'number' && coords?.y !== undefined) {
      const nodeCoords = getRealCoords(node.el)
      const relY = coords.y - nodeCoords.top
      const segmentHeight = nodeCoords.height / targetRowSpan
      const segment = Math.max(1, Math.min(targetRowSpan, Math.floor(relY / segmentHeight) + 1))
      if (segment > 1) {
        const valuesForPlacement = Array.isArray(latestValues)
          ? latestValues.map((v) => {
              const k = (v as SchemaNode | undefined)?.__key
              if (typeof k === 'string' && k) return findSchemaByKey(liveSchema, k) ?? v
              return v
            })
          : []
        const placements = computePlacements(valuesForPlacement)
        const p = placements[node.data.index]
        if (p) {
          const desiredRow = p.row + (segment - 1)
          const desiredCol = ascending ? p.col + p.colSpan : p.col
          insertState.explicitRow = desiredRow
          insertState.explicitIndex = findInsertIndexForCell(placements, desiredRow, desiredCol)
        }
      }
    }

    if (shouldSegment) {
      const gapPx = 8
      const segmentHeight = (targetHeight - gapPx * (targetRowSpan - 1)) / targetRowSpan
      const bg = getComputedStyle(insertPointEl).backgroundColor

      insertPointEl.style.backgroundColor = 'transparent'
      insertPointEl.replaceChildren()

      for (let i = 0; i < targetRowSpan; i++) {
        const seg = document.createElement('div')
        Object.assign(seg.style, {
          position: 'absolute',
          left: '0px',
          top: `${i * (segmentHeight + gapPx)}px`,
          width: '4px',
          height: `${Math.max(0, segmentHeight)}px`,
          backgroundColor: bg,
          borderRadius: '2px',
        })
        insertPointEl.appendChild(seg)
      }
    } else {
      resetInsertPointSegments()
    }

    Object.assign(insertPointEl.style, {
      left: `${leftPosition}px`,
      top: `${position.y[0]!}px`,
      bottom: '',
      height: `${targetHeight}px`,
      width: '4px',
      right: '',
    })

    // L1：横向插入（放在左侧/右侧）的宽度徽标——命中 row-span>1 目标的下半段
    // （explicitRow 已在上面算出）时提交走另一条分支，这里不显示徽标（见
    // computeInsertBadgeText 的说明）
    const horizontalDirection: GridInsertDirection = ascending ? 'right' : 'left'
    const horizontalBadgeText =
      typeof insertState.explicitRow === 'number'
        ? null
        : computeInsertBadgeText(parent, node, horizontalDirection, ctx)
    if (horizontalBadgeText) {
      positionInsertBadge(horizontalBadgeText, {
        left: leftPosition,
        top: position.y[0]!,
        width: insertPointWidth,
        height: targetHeight,
        vertical: false,
      })
    } else {
      hideInsertBadge()
    }
  }

  insertState.targetIndex = node.data.index
  insertState.ascending = ascending
}
