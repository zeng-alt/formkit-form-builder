// @vitest-environment happy-dom
// ═══ 按钮组的「禁用」：运行时组内按钮必须不可点 ═══════════════════════════════════
// 组内按钮是 FormKit 输入节点，而按钮组本身是 $cmp 组件、不在 FormKit 节点树里——它的
// disabled 不会经 FormKit 级联到子按钮，NButtonGroup 也没有 disabled prop。实际生效靠的
// 是格式化管线：format-schema → formatContainerPreviewNode → decorateButtonGroupChildren
// 把 disabled 注入到每个子按钮节点上（见 elements/canvas.ts）。
// 这条路径藏在管线里而不在组件里，很容易被重构无意中破坏，这里用真实挂载锁住它。
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FormDefinition, FormNode } from '@/types/dsl'

function definitionWithGroup(groupDisabled: boolean): FormDefinition {
  const buttons = ['A', 'B'].map((label) => {
    const btn = getElementTypeDef('naiveButton')!.defaults() as FormNode
    btn.label = label
    return btn
  })
  const group = getElementTypeDef('buttonGroup')!.defaults() as FormNode & { children: FormNode[] }
  group.children = buttons
  group.props = { ...group.props, ...(groupDisabled ? { disabled: true } : {}) }
  return {
    version: DSL_VERSION,
    id: 'bg',
    name: 'bg',
    root: {
      id: 'r',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [group],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

async function renderButtons(groupDisabled: boolean) {
  const wrapper = mount(FormRenderer, {
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    props: { definition: definitionWithGroup(groupDisabled) },
  })
  for (let i = 0; i < 6; i++) await nextTick()
  const buttons = [...wrapper.element.querySelectorAll('.n-button')]
  const disabled = buttons.filter((b) => b.classList.contains('n-button--disabled')).length
  wrapper.unmount()
  return { total: buttons.length, disabled }
}

describe('按钮组禁用（运行时）', () => {
  it('按钮组禁用时，组内所有按钮都处于禁用态', async () => {
    const { total, disabled } = await renderButtons(true)
    expect(total).toBe(2)
    expect(disabled).toBe(2)
  })

  it('按钮组未禁用时，组内按钮可用（对照组，证明上一条不是恒真）', async () => {
    const { total, disabled } = await renderButtons(false)
    expect(total).toBe(2)
    expect(disabled).toBe(0)
  })
})
