// ═══ E1：结构树 ↔ 画布联动的小工具 ══════════════════════════════════════════════
// 画布上每个条目都带 data-item-key（见 CanvasGridItem.vue / ContainerChildrenGrid.vue，
// 值即 DSL 节点的 key），这里只读这个属性定位 DOM，不改动 D 负责的那两个文件。
// 高亮反馈复用 hover-feedback.ts 同一套「body 下绝对定位浮层」手法，但这是独立的
// 浮层实例（不同 data-* 标记），避免和拖拽悬停反馈互相抢用同一批 DOM 节点。

function escapeKey(key: string): string {
  // 画布 key 由 generateKey() 生成（uuid 或 base36 随机串），理论上不含 CSS
  // 选择器特殊字符；仍用 CSS.escape 兜底，避免个别环境/历史数据里出现怪字符时
  // querySelector 直接抛错。
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(key)
    : key.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
}

/** 按 key 找到画布上对应条目的 DOM 节点（根级 / 容器内一视同仁，key 全树唯一）。 */
export function findCanvasItemEl(key: string): HTMLElement | null {
  if (!key) return null
  return document.querySelector<HTMLElement>(`[data-item-key="${escapeKey(key)}"]`)
}

/** 把画布上对应条目滚动到可视区域（尽量居中），找不到时什么也不做。 */
export function scrollCanvasItemIntoView(key: string): HTMLElement | null {
  const el = findCanvasItemEl(key)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  return el
}

// ─── 悬停虚线框：结构树悬停某节点时，在画布对应条目上叠一层浮层 ──────────────────

let hoverBox: HTMLDivElement | null = null

function scrollOffset() {
  return {
    x: window.scrollX || document.documentElement.scrollLeft,
    y: window.scrollY || document.documentElement.scrollTop,
  }
}

function ensureHoverBox() {
  if (hoverBox) return
  hoverBox = document.createElement('div')
  hoverBox.setAttribute('data-structure-tree-overlay', 'hover')
  Object.assign(hoverBox.style, {
    position: 'absolute',
    display: 'none',
    pointerEvents: 'none',
    zIndex: '1850',
    borderRadius: '10px',
    border: '1.5px dashed rgba(124, 158, 248, 0.85)',
    backgroundColor: 'rgba(124, 158, 248, 0.08)',
    boxSizing: 'border-box',
  })
  document.body.appendChild(hoverBox)
}

/** 结构树悬停某节点：在画布对应条目上显示悬停虚线框；找不到对应 DOM（如折叠/未渲染）
 *  时隐藏浮层，不报错。 */
export function showStructureHoverOverlay(key: string) {
  const el = findCanvasItemEl(key)
  if (!el) {
    hideStructureHoverOverlay()
    return
  }
  ensureHoverBox()
  const rect = el.getBoundingClientRect()
  const { x: sx, y: sy } = scrollOffset()
  Object.assign(hoverBox!.style, {
    display: 'block',
    top: `${rect.top + sy}px`,
    left: `${rect.left + sx}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  })
}

export function hideStructureHoverOverlay() {
  if (hoverBox) hoverBox.style.display = 'none'
}
