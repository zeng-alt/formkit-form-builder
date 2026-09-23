import type { Coordinates, NodeRecord } from '@formkit/drag-and-drop'
import { isDragState, isSynthDragState, parents, state } from '@formkit/drag-and-drop'
import type { SchemaNode } from '@/utils/schema/types'

// @formkit/drag-and-drop 自己把 NodeData.range 声明为 { ascending?, descending? }（用于它
// 内置的排序算法），但本文件的 defineRanges 把这个字段整个改写成四向命中范围
// （left/right/top/bottom），供画布插入线定位使用——字段同名但形状是本仓库私有的，库的类型
// 覆盖不到，故单独定义一个接口，读写处按这个接口断言，而不是裸 any。
export interface InsertRange {
  x: number[]
  y: number[]
  vertical: boolean
}
export interface InsertRangeData {
  left?: InsertRange
  right?: InsertRange
  top?: InsertRange
  bottom?: InsertRange
}

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

  const enabledNodes = parentData.enabledNodes as NodeRecord<SchemaNode>[]

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

    // node.data.range 的库类型是 { ascending?, descending? }，这里存的是本仓库私有的
    // 四向命中范围形状（见文件头 InsertRangeData 说明），按该接口断言
    const rangeData = node.data.range as InsertRangeData

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
