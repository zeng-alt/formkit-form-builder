// ═══ L2/L3：容器悬停高亮标签 + 不可放置反馈 ═══════════════════════════════════
// 与 insert-point.ts 的插入线同一套约定：body 下的绝对定位浮层，不碰目标元素
// 自身的 classList（避免和库内部对空容器 dropZoneClass 的增删打架），也不在列表里
// 插入真实占位 DOM 节点（@formkit/drag-and-drop 的 MutationObserver 要求 DOM 数量
// 与 values 一致）。三块浮层各自独立创建/定位，plugin.ts 按当前悬停目标的 accepts
// 结果二选一显示，drag 结束时统一 clearHoverFeedback()。

let highlightBox: HTMLDivElement | null = null
let highlightLabel: HTMLDivElement | null = null
let rejectBadge: HTMLDivElement | null = null

function scrollOffset() {
  return {
    x: window.scrollX || document.documentElement.scrollLeft,
    y: window.scrollY || document.documentElement.scrollTop,
  }
}

function ensureHighlightEls() {
  if (highlightBox && highlightLabel) return
  highlightBox = document.createElement('div')
  highlightBox.setAttribute('data-dnd-overlay', 'container-highlight')
  Object.assign(highlightBox.style, {
    position: 'absolute',
    display: 'none',
    pointerEvents: 'none',
    zIndex: '1900',
    borderRadius: '10px',
    border: '1.5px dashed rgba(162, 119, 255, 0.7)',
    backgroundColor: 'rgba(162, 119, 255, 0.06)',
    boxSizing: 'border-box',
  })

  highlightLabel = document.createElement('div')
  highlightLabel.setAttribute('data-dnd-overlay', 'container-label')
  Object.assign(highlightLabel.style, {
    position: 'absolute',
    display: 'none',
    pointerEvents: 'none',
    zIndex: '1901',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#fff',
    backgroundColor: '#a277ff',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
  })

  document.body.appendChild(highlightBox)
  document.body.appendChild(highlightLabel)
}

/** 高亮某个容器的放置区，并在其左上角显示「放入：xxx」标签 */
export function showContainerHighlight(el: HTMLElement, label: string) {
  ensureHighlightEls()
  const rect = el.getBoundingClientRect()
  const { x: sx, y: sy } = scrollOffset()

  Object.assign(highlightBox!.style, {
    display: 'block',
    top: `${rect.top + sy}px`,
    left: `${rect.left + sx}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  })

  highlightLabel!.textContent = label
  Object.assign(highlightLabel!.style, {
    display: 'block',
    // 标签浮在容器左上角外侧（贴着高亮框上边缘），不遮挡容器内容
    top: `${rect.top + sy - 22}px`,
    left: `${rect.left + sx + 4}px`,
  })
}

export function hideContainerHighlight() {
  if (highlightBox) highlightBox.style.display = 'none'
  if (highlightLabel) highlightLabel.style.display = 'none'
}

function ensureRejectBadge() {
  if (rejectBadge) return
  rejectBadge = document.createElement('div')
  rejectBadge.setAttribute('data-dnd-overlay', 'reject-badge')
  Object.assign(rejectBadge.style, {
    position: 'absolute',
    display: 'none',
    pointerEvents: 'none',
    zIndex: '2100',
    padding: '6px 10px',
    borderRadius: '8px',
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#fff',
    backgroundColor: '#ef4444',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
    maxWidth: '240px',
  })
  document.body.appendChild(rejectBadge)
}

/** 指针附近显示「不能放在这里」+ 可选的一句原因 */
export function showRejectBadge(clientX: number, clientY: number, title: string, reason?: string) {
  ensureRejectBadge()
  const badge = rejectBadge!
  badge.replaceChildren()

  const titleEl = document.createElement('div')
  titleEl.textContent = title
  titleEl.style.fontWeight = '600'
  badge.appendChild(titleEl)

  if (reason) {
    const reasonEl = document.createElement('div')
    reasonEl.textContent = reason
    reasonEl.style.opacity = '0.92'
    reasonEl.style.marginTop = '2px'
    badge.appendChild(reasonEl)
  }

  const { x: sx, y: sy } = scrollOffset()
  Object.assign(badge.style, {
    display: 'block',
    left: `${clientX + sx + 16}px`,
    top: `${clientY + sy + 18}px`,
  })
}

export function hideRejectBadge() {
  if (rejectBadge) rejectBadge.style.display = 'none'
}

/** 拖动结束/取消时统一清理：所有浮层复位为隐藏（不移除节点，下次拖动直接复用） */
export function clearHoverFeedback() {
  hideContainerHighlight()
  hideRejectBadge()
}
