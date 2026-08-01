import type { Coordinates, NodeRecord } from '@formkit/drag-and-drop'
import { isDragState, isSynthDragState, parents, state } from '@formkit/drag-and-drop'

// 将元素的 DOM 坐标转换为带滚动偏移的“页面坐标”
export function getRealCoords(el: HTMLElement): Coordinates {
  const { top, bottom, left, right, height, width } = el.getBoundingClientRect()

  const scrollLeft = window.scrollX || document.documentElement.scrollLeft
  const scrollTop = window.scrollY || document.documentElement.scrollTop

  return {
    top: top + scrollTop,
    bottom: bottom + scrollTop,
    left: left + scrollLeft,
    right: right + scrollLeft,
    height,
    width,
  }
}

// 为每个 draggable node 计算插入命中范围（left/right/top/bottom）
export function defineRanges(parent: HTMLElement) {
  if (!isDragState(state) && !isSynthDragState(state)) return

  const parentData = parents.get(parent)
  if (!parentData) return

  const axis = parent.getAttribute('data-dnd-axis')
  const onlyX = axis === 'x'

  const enabledNodes = parentData.enabledNodes as NodeRecord<any>[]

  enabledNodes.forEach((node) => {
    node.data.range = {}

    const nodeCoords = getRealCoords(node.el)

    const top = nodeCoords.top
    const bottom = nodeCoords.bottom
    const left = nodeCoords.left
    const right = nodeCoords.right
    const width = nodeCoords.width
    const height = nodeCoords.height

    const maxHorizontalThreshold = 60
    const horizontalThreshold = Math.min(width * 0.25, maxHorizontalThreshold)

    const rangeData = node.data.range as any

    rangeData.left = {
      x: [left, left + horizontalThreshold],
      y: [top, bottom],
      vertical: false,
    }

    rangeData.right = {
      x: [right - horizontalThreshold, right],
      y: [top, bottom],
      vertical: false,
    }

    if (!onlyX) {
      rangeData.top = {
        x: [left + horizontalThreshold, right - horizontalThreshold],
        y: [top, top + height / 2],
        vertical: true,
      }

      rangeData.bottom = {
        x: [left + horizontalThreshold, right - horizontalThreshold],
        y: [top + height / 2, bottom],
        vertical: true,
      }
    }
  })
}
