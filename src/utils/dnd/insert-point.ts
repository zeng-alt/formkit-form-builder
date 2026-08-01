 
import type { InsertState, NodeRecord, ParentRecord } from '@formkit/drag-and-drop'
import { state } from '@formkit/drag-and-drop'
import { formSchema } from '@/state/form-schema'
import { findSchemaByKey } from './schema'
import { computePlacements, findInsertIndexForCell, getRowSpan } from './grid'
import { getRealCoords } from './range'

// 创建插入提示线 DOM
export function createInsertPoint<T>(parent: ParentRecord<T>, insertState: InsertState<T>) {
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

export function removeInsertPoint<T>(insertState: InsertState<T>) {
  if (insertState.insertPoint?.el) insertState.insertPoint.el.remove()
  insertState.insertPoint = null
}

// 根据命中范围定位插入提示线（支持 row-span 的分段提示 + 更精确的插入位置计算）
export function positionInsertPoint<T>(
  parent: ParentRecord<T>,
  position: { x: number[]; y: number[]; vertical: boolean },
  ascending: boolean,
  node: NodeRecord<T>,
  insertState: InsertState<T>,
) {
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

  ;(insertState as any).explicitIndex = undefined
  ;(insertState as any).explicitRow = undefined

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
  } else {
    const insertPointWidth = insertPointEl.getBoundingClientRect().width || 4
    const targetX = position.x[ascending ? 1 : 0]!
    const leftPosition = targetX - insertPointWidth / 2
    const targetHeight = position.y[1]! - position.y[0]!

    const latestValues = parent.data.getValues(parent.el) as any
    const latestValue =
      Array.isArray(latestValues) && typeof node.data.index === 'number' ? latestValues[node.data.index] : undefined
    const targetKey = (node.data.value as any)?.__key
    const schemaValue =
      typeof targetKey === 'string' && targetKey ? findSchemaByKey(formSchema.value as any[], targetKey) : undefined
    const targetRowSpan = getRowSpan(schemaValue ?? latestValue ?? node.data.value)
    const draggedRowSpan = (insertState as any).draggedRowSpan ?? 1
    const shouldSegment = targetRowSpan > 1 && draggedRowSpan === 1

    const coords = (state as any).coordinates as { x?: number; y?: number } | undefined
    if (targetRowSpan > 1 && typeof node.data.index === 'number' && coords?.y !== undefined) {
      const nodeCoords = getRealCoords(node.el)
      const relY = coords.y - nodeCoords.top
      const segmentHeight = nodeCoords.height / targetRowSpan
      const segment = Math.max(1, Math.min(targetRowSpan, Math.floor(relY / segmentHeight) + 1))
      if (segment > 1) {
        const valuesForPlacement = Array.isArray(latestValues)
          ? latestValues.map((v: any) => {
              const k = v?.__key
              if (typeof k === 'string' && k) return findSchemaByKey(formSchema.value as any[], k) ?? v
              return v
            })
          : []
        const placements = computePlacements(valuesForPlacement)
        const p = placements[node.data.index]
        if (p) {
          const desiredRow = p.row + (segment - 1)
          const desiredCol = ascending ? p.col + p.colSpan : p.col
          ;(insertState as any).explicitRow = desiredRow
          ;(insertState as any).explicitIndex = findInsertIndexForCell(placements, desiredRow, desiredCol)
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
  }

  insertState.targetIndex = node.data.index
  insertState.ascending = ascending
}
