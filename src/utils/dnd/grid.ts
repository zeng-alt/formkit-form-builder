// 从 outerClass 中解析 col-span，默认 12；优先 DSL layout.colspan（输入组语义宽度来源）
export function getColSpan(item: any): number {
  const layoutSpan = item?.layout?.colspan
  if (typeof layoutSpan === 'number' && Number.isFinite(layoutSpan) && layoutSpan > 0) {
    return Math.max(1, Math.min(12, Math.round(layoutSpan)))
  }
  const outerClass = item?.outerClass
  if (typeof outerClass !== 'string') return 12
  const match = outerClass.match(/col-span-(\d+)/)
  return match ? parseInt(match[1]!, 10) : 12
}

// 写入/替换 outerClass 中的 col-span-*
export function setColSpan(item: any, span: number) {
  if (!item) return
  let classes = item.outerClass || ''
  if (/col-span-\d+/.test(classes)) {
    classes = classes.replace(/col-span-\d+/, `col-span-${span}`)
  } else {
    classes = `${classes} col-span-${span}`.trim()
  }
  item.outerClass = classes
}

// 输入组内层元素：宽度只由 layout.colspan 决定（经 outerClass.col-span-N 往返回读 layout），
// 去掉 outerClass 里的 w-[xx%] 宽度类与按钮的 pt-2，避免遗留宽度类撑乱画布/预览。
// 保留 col-span-N / row-span-N 以便 fromSchema 把宽度解析回 layout.colspan。
export function stripInputGroupOuterClass(child: any): any {
  if (!child || typeof child !== 'object') return child
  const clean = (oc?: string) =>
    (typeof oc === 'string' ? oc : '')
      .replace(/\b!?w-\[[^\]]+\]/g, '')
      .replace(/\bpt-2\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const next: any = { ...child, outerClass: clean(child.outerClass) || undefined }
  // $cmp 节点：FormKitSchema 把嵌套 props 透传组件，props.outerClass 同样要去掉宽度类
  if (child.props && typeof child.props === 'object') {
    next.props = { ...child.props, outerClass: clean(child.props.outerClass) || undefined }
  }
  return next
}

// 容器整体禁用时，给子节点注入 disabled（按钮组等）：$cmp 收进 props、$el 收进 attrs、其余置顶层。
// 只做浅克隆，不改原节点，避免污染 DSL 真源。
export function applyGroupDisabled(child: any): any {
  if (!child || typeof child !== 'object') return child
  const base: any = { ...child }
  if (typeof base.$cmp === 'string') {
    base.props = {
      ...(base.props && typeof base.props === 'object' ? base.props : {}),
      disabled: true,
    }
  } else if (typeof base.$el === 'string') {
    base.attrs = {
      ...(base.attrs && typeof base.attrs === 'object' ? base.attrs : {}),
      disabled: true,
    }
  } else {
    base.disabled = true
  }
  return base
}

// 从 outerClass 中解析 row-span，默认 1
export function getRowSpan(item: any): number {
  const outerClass = item?.outerClass
  if (typeof outerClass !== 'string') return 1
  const match = outerClass.match(/\brow-span-(\d+)\b/)
  const parsed = match ? parseInt(match[1]!, 10) : 1
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

// 输入组（单行 flex-nowrap）总 col-span 不得超过 maxSpan（默认 12 = 一行网格上限）。
// 超出时按比例缩放各元素 span（每项至少 1），四舍五入后仍超限则从最大的项逐项减 1，
// 保证总和 ≤ maxSpan，避免元素溢出容器、右侧 resize/删除按钮被裁掉。
export function rebalanceRowSpans(values: any[], maxSpan = 12): void {
  if (!Array.isArray(values) || values.length === 0) return
  const spans = values.map((v) => Math.max(1, Math.min(maxSpan, getColSpan(v))))
  const total = spans.reduce((a, b) => a + b, 0)
  if (total <= maxSpan) return
  const scale = maxSpan / total
  const next = spans.map((s) => Math.max(1, Math.round(s * scale)))
  let used = next.reduce((a, b) => a + b, 0)
  const order = next.map((s, i) => [s, i] as [number, number]).sort((a, b) => b[0]! - a[0]!)
  let k = 0
  while (used > maxSpan && k < order.length) {
    const i = order[k]![1]
    if (next[i]! > 1) {
      next[i] = next[i]! - 1
      used--
    }
    k++
  }
  values.forEach((v, i) => setColSpan(v, next[i]!))
}

export type Placement = {
  index: number
  row: number
  col: number
  rowSpan: number
  colSpan: number
}

// 基于 12 列网格 + rowSpan/colSpan 做简易“自动布局”，用于推断某个元素在第几行/第几列
export function computePlacements(values: any[]): Placement[] {
  const placements: Placement[] = []
  const occupied = new Set<string>()
  const keyOf = (r: number, c: number) => `${r}:${c}`
  const canPlace = (r: number, c: number, rSpan: number, cSpan: number) => {
    for (let rr = r; rr < r + rSpan; rr++) {
      for (let cc = c; cc < c + cSpan; cc++) {
        if (occupied.has(keyOf(rr, cc))) return false
      }
    }
    return true
  }
  const occupy = (r: number, c: number, rSpan: number, cSpan: number) => {
    for (let rr = r; rr < r + rSpan; rr++) {
      for (let cc = c; cc < c + cSpan; cc++) {
        occupied.add(keyOf(rr, cc))
      }
    }
  }

  for (let i = 0; i < values.length; i++) {
    const item = values[i]
    const colSpan = Math.max(1, Math.min(12, getColSpan(item)))
    const rowSpan = Math.max(1, Math.min(6, getRowSpan(item)))
    let placed = false
    for (let row = 1; row <= 200 && !placed; row++) {
      for (let col = 1; col <= 12 - colSpan + 1; col++) {
        if (canPlace(row, col, rowSpan, colSpan)) {
          occupy(row, col, rowSpan, colSpan)
          placements.push({ index: i, row, col, rowSpan, colSpan })
          placed = true
          break
        }
      }
    }
    if (!placed) placements.push({ index: i, row: 1, col: 1, rowSpan, colSpan })
  }

  return placements
}

function cellKey(row: number, col: number) {
  return row * 100 + col
}

// 根据“目标 cell 的行列”，推断应该插入到 values 的哪个 index
export function findInsertIndexForCell(placements: Placement[], row: number, col: number) {
  const target = cellKey(row, col)
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i]!
    if (cellKey(p.row, p.col) >= target) return i
  }
  return placements.length
}

// 用 col-span 近似推断“视觉行”（兼容老逻辑，row-span 情况下会在 explicitRow 逻辑中绕开）
export function getVisualRows(values: any[]) {
  const rows: { startIndex: number; endIndex: number; items: any[]; totalSpan: number }[] = []
  let currentRow: { startIndex: number; endIndex: number; items: any[]; totalSpan: number } = {
    startIndex: 0,
    endIndex: 0,
    items: [],
    totalSpan: 0,
  }

  for (let i = 0; i < values.length; i++) {
    const item = values[i]
    const span = getColSpan(item)
    if (currentRow.totalSpan + span > 12 && currentRow.items.length > 0) {
      rows.push(currentRow)
      currentRow = { startIndex: i, endIndex: i, items: [item], totalSpan: span }
    } else {
      currentRow.items.push(item)
      currentRow.endIndex = i
      currentRow.totalSpan += span
    }
  }

  if (currentRow.items.length > 0) rows.push(currentRow)
  return rows
}

// 仅对指定行（row-span 覆盖到的那一行）进行均分 col-span，避免影响其他行
export function adjustColSpansForInsertAtRow(
  targetParentValues: any[],
  row: number,
  insertValues: any[],
) {
  const placements = computePlacements(targetParentValues)
  const rowIndices = placements
    .filter((p) => row >= p.row && row < p.row + p.rowSpan)
    .map((p) => p.index)
  const rowItems = rowIndices.map((i) => targetParentValues[i]).filter(Boolean)
  const totalCount = rowItems.length + insertValues.length
  if (totalCount <= 0) return

  if (totalCount <= 4) {
    const newSpan = 12 / totalCount
    rowItems.forEach((item) => setColSpan(item, newSpan))
    insertValues.forEach((val) => setColSpan(val, newSpan))
  } else {
    insertValues.forEach((val) => setColSpan(val, 3))
  }
}
