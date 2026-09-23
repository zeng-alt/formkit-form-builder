// ═══ L5：面板拖出元素时的自定义拖拽影像 ════════════════════════════════════════
// 只负责造出胶囊元素并挂到 body——setDragImage 要求节点已经在文档里才能正确取到
// 渲染结果，挂在屏幕外而不是 display:none（后者不会被布局引擎渲染，截不出图）。
// 调用方（DraggableList.vue 的 dragConfig.dragImage）负责真正调用
// dataTransfer.setDragImage：@formkit/drag-and-drop 的 config.dragImage 钩子只管
// "返回一个元素"，库自己并不会替调用方调这一步（读它的 initDrag 实现：
// config.dragImage 存在时直接跳过了内置调用 setDragImage 的分支）。库会在
// dragstart 处理完的下一个宏任务把返回的元素移除（initDrag 里的
// setTimeout(() => dragImage?.remove())），这里不需要自己收尾。
// 颜色用 CSS 变量（--card/--foreground）而不是写死的浅色，跟随亮暗主题——
// 应用的 dark 类挂在 <html> 上（vueuse useColorMode 默认策略），body 的后代都能读到。
export function createPaletteDragImage(icon: string | undefined, label: string): HTMLElement {
  const el = document.createElement('div')
  Object.assign(el.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    border: '1.5px solid #a277ff',
    backgroundColor: 'var(--card, #fff)',
    color: 'var(--foreground, #1f2937)',
    fontSize: '12px',
    fontWeight: '500',
    boxShadow: '0 4px 14px rgba(162, 119, 255, 0.35)',
    whiteSpace: 'nowrap',
  })

  if (icon) {
    const iconEl = document.createElement('span')
    iconEl.className = `${icon}`
    Object.assign(iconEl.style, { width: '14px', height: '14px', color: '#a277ff' })
    iconEl.setAttribute('aria-hidden', 'true')
    el.appendChild(iconEl)
  }

  const labelEl = document.createElement('span')
  labelEl.textContent = label
  el.appendChild(labelEl)

  document.body.appendChild(el)
  return el
}
