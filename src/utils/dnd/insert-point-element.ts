export function createDefaultInsertPointElement() {
  const div = document.createElement('div')
  div.setAttribute('data-insert-bg', '#22c55e')
  div.classList.add('dnd-insert-point')
  Object.assign(div.style, {
    backgroundColor: '#22c55e',
    opacity: '0.9',
    pointerEvents: 'none',
    borderRadius: '2px',
    zIndex: '2000',
    boxShadow: '0 0 12px 2px rgba(34, 197, 94, 0.5)',
  })
  return div
}
