import type { InsertState } from '@formkit/drag-and-drop'

// 插入提示线与拖拽插入过程的共享状态（跨事件共享）
export type InsertStateEx<T> = InsertState<T> & {
  // 当前命中方向是否为上下插入（top/bottom），否则为左右插入（left/right）
  verticalInsert?: boolean
  // 当前拖拽元素的最大 row-span（用于提示线分段显示）
  draggedRowSpan?: number
  // 对 row-span>1 的目标元素，命中到下半行时会计算出一个更精确的插入 index
  explicitIndex?: number
  // 对 row-span>1 的目标元素，命中到下半行时会计算出一个更精确的“目标行”
  explicitRow?: number
}

// 插入提示线与拖拽插入过程的共享状态（跨事件共享）
// 注：@formkit/drag-and-drop 内部的 insertState 并未导出，这里维护本地共享对象
export const insertState: InsertStateEx<unknown> = {
  draggedOverNodes: [],
  draggedOverParent: null,
  targetIndex: 0,
  ascending: false,
  insertPoint: null,
  dragging: false,
} as any
