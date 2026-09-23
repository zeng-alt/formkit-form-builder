// ═══ L6：放下后自动选中的判定 ═════════════════════════════════════════════════
// 纯函数：只有"从面板拖入、且这次提交只插入了一个新元素"才自动选中——画布内移动
// 元素、跨容器移动已有元素、以及一次插入多个元素（目前没有这种交互，留着更保险）
// 都不自动改变选中态，避免打断用户正在编辑的属性面板。
export function resolveDropSelectionKey(
  isSource: boolean,
  insertValues: Array<{ __key?: unknown } | undefined>,
): string | undefined {
  if (!isSource || insertValues.length !== 1) return undefined
  const key = insertValues[0]?.__key
  return typeof key === 'string' && key ? key : undefined
}
