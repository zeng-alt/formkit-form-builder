// @vitest-environment happy-dom
// ═══ 拖动结束后清理悬停浮层 ═══════════════════════════════════════════════════════
// @formkit/drag-and-drop 只在全局 state 上广播 'dragEnded'，不在单个 parent 上触发。
// 清理逻辑曾挂在 parentData.on('dragEnded') 上从不执行：把元素拖进容器放下后，
// 「放入：xxx」高亮框和标签一直留在画布上。
import { describe, expect, it } from 'vitest'
import { dragAndDrop, state } from '@formkit/drag-and-drop'
import { customInsertPlugin } from '@/utils/dnd/plugin'
import { showContainerHighlight } from '@/utils/dnd/hover-feedback'

describe('拖动结束清理', () => {
  it('全局 dragEnded 广播后收起容器高亮框与标签', () => {
    const parent = document.createElement('ul')
    document.body.appendChild(parent)
    dragAndDrop({
      parent,
      getValues: () => [],
      setValues: () => {},
      config: {
        plugins: [customInsertPlugin({ insertPoint: () => document.createElement('div') }, null)],
      },
    })

    const container = document.createElement('div')
    document.body.appendChild(container)
    showContainerHighlight(container, '放入：卡片')
    const box = document.querySelector('[data-dnd-overlay="container-highlight"]') as HTMLElement
    const label = document.querySelector('[data-dnd-overlay="container-label"]') as HTMLElement
    expect(box.style.display).toBe('block')
    expect(label.style.display).toBe('block')

    state.emit('dragEnded', state)

    expect(box.style.display).toBe('none')
    expect(label.style.display).toBe('none')
  })
})
