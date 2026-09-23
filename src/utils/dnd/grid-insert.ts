// ═══ J3：拖放宽度规则（grid 容器） ══════════════════════════════════════════════
// 面板拖入新元素、画布内移动元素，落到某个已有元素（T）旁边时的宽度与插入位置计算。
// 只管 grid 布局的画布根与容器（card/group/list 模板/tabs pane/steps pane 等）；
// 输入组（横向 row 布局）与按钮组走各自不变的旧规则，不经过这里（见 commit.ts 的
// axis 判断）。row-span > 1 的目标命中到具体子行时也不走这里，沿用已有的
// explicitRow + adjustColSpansForInsertAtRow（见 commit.ts）。
//
// 纯函数：不改动入参数组/节点，返回一份新的兄弟数组（已经把新元素插入到正确位置、
// 必要时也调整了目标/同行元素的宽度）。commit.ts 的两条提交路径（同容器内移动、
// 跨容器/面板拖入）共用同一份实现，不再各自维护一套位置计算。
import { getColSpan, getVisualRows, setColSpan } from './grid'

export type GridInsertDirection = 'left' | 'right' | 'top' | 'bottom'

/** 按 verticalInsert / ascending（见 insert-state.ts、plugin.ts 的四向命中范围）
 *  换算成这里用的方向枚举。 */
export function resolveGridInsertDirection(
  isVertical: boolean | undefined,
  ascending: boolean | undefined,
): GridInsertDirection {
  if (isVertical) return ascending ? 'bottom' : 'top'
  return ascending ? 'right' : 'left'
}

/**
 * 计算把 inserted 插入到 siblings[targetIndex]（T）旁边之后的完整兄弟数组。
 *
 * 横向插入（left/right）：
 * - T 宽度 12：T 与新元素各占 6。
 * - T 所在视觉行剩余空间 >= 2：新元素占满剩余空间，其余元素不动。
 * - 行已满（剩余 < 2）：把 T 一分为二（T 取 ceil(s/2)、新元素取 floor(s/2)，
 *   两者都需 >= 2）；分不开（T 宽 < 4）则新元素与 T 同宽，正常插到 T 旁边，
 *   放不下时交给 CSS 网格自动换行，这里不用再手动挪行。
 *
 * 纵向插入（top/bottom）：新元素宽度与 T 一致；插入位置是 T 所在视觉行的
 * 最后一个元素之后（下方）或第一个元素之前（上方），而不是简单挤进 T 紧邻的下标——
 * 这样新元素才会真的出现在 T 那一行的下一行/上一行。
 */
export function computeGridInsert(
  siblings: any[],
  targetIndex: number,
  direction: GridInsertDirection,
  inserted: any[],
): any[] {
  if (
    !Array.isArray(siblings) ||
    targetIndex < 0 ||
    targetIndex >= siblings.length ||
    inserted.length === 0
  ) {
    return siblings
  }

  const rows = getVisualRows(siblings)
  const row = rows.find((r) => targetIndex >= r.startIndex && targetIndex <= r.endIndex)
  if (!row) return siblings

  if (direction === 'top' || direction === 'bottom') {
    const width = getColSpan(siblings[targetIndex])
    const resizedInserted = inserted.map((n) => setColSpan(n, width))
    const insertPos = direction === 'bottom' ? row.endIndex + 1 : row.startIndex
    const next = [...siblings]
    next.splice(insertPos, 0, ...resizedInserted)
    return next
  }

  const target = siblings[targetIndex]
  const s = getColSpan(target)
  const used = row.totalSpan
  const remaining = 12 - used

  let newWidth: number
  let updatedTarget = target

  if (s === 12) {
    newWidth = 6
    updatedTarget = setColSpan(target, 6)
  } else if (remaining >= 2) {
    newWidth = remaining
  } else {
    const half1 = Math.ceil(s / 2)
    const half2 = Math.floor(s / 2)
    if (half1 >= 2 && half2 >= 2) {
      updatedTarget = setColSpan(target, half1)
      newWidth = half2
    } else {
      newWidth = s
    }
  }

  const resizedInserted = inserted.map((n) => setColSpan(n, newWidth))
  const next = [...siblings]
  next[targetIndex] = updatedTarget
  const insertPos = direction === 'right' ? targetIndex + 1 : targetIndex
  next.splice(insertPos, 0, ...resizedInserted)
  return next
}
