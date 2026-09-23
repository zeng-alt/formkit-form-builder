// ═══ L1：把 computeGridInsertBadgeInfo 的结果格式化成插入线旁徽标文案 ══════════
// 纯字符串拼装，不做任何宽度计算（那部分在 grid-insert.ts，已经和真实提交结果
// 来自同一份实现）；这里只负责把 { kind, ... } 翻成本地化文案。
import type { GridInsertBadgeInfo, GridInsertDirection } from './grid-insert'

export type Translate = (key: string, params?: Record<string, string | number>) => string

const DIRECTION_KEY: Record<GridInsertDirection, string> = {
  left: 'dnd.insertBadge.left',
  right: 'dnd.insertBadge.right',
  top: 'dnd.insertBadge.top',
  bottom: 'dnd.insertBadge.bottom',
}

export function formatGridInsertBadge(info: GridInsertBadgeInfo, t: Translate): string {
  switch (info.kind) {
    case 'halve':
      return t('dnd.insertBadge.halve', { a: info.width, b: info.width })
    case 'split':
      return t('dnd.insertBadge.split', { a: info.targetWidth, b: info.insertedWidth })
    case 'side':
      return t(DIRECTION_KEY[info.direction], { width: info.width })
    default:
      return ''
  }
}
