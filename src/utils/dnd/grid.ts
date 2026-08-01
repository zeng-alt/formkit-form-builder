// 从 outerClass 中解析 col-span，默认 12
export function getColSpan(item: any): number {
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

// 从 outerClass 中解析 row-span，默认 1
export function getRowSpan(item: any): number {
  const outerClass = item?.outerClass
  if (typeof outerClass !== 'string') return 1
  const match = outerClass.match(/\brow-span-(\d+)\b/)
  const parsed = match ? parseInt(match[1]!, 10) : 1
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
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
