// L1：插入线改用主题紫（#a277ff），亮/暗主题下都够清晰——与画布其余拖拽反馈
// （CANVAS_DRAGGING_CLASS 的光晕、CANVAS_DROP_ZONE_CLASS 的描边）同一色系。
export function createDefaultInsertPointElement() {
  const div = document.createElement('div')
  div.setAttribute('data-insert-bg', '#a277ff')
  div.classList.add('dnd-insert-point')
  Object.assign(div.style, {
    backgroundColor: '#a277ff',
    opacity: '0.9',
    pointerEvents: 'none',
    borderRadius: '2px',
    zIndex: '2000',
    boxShadow: '0 0 12px 2px rgba(162, 119, 255, 0.55)',
  })
  return div
}
