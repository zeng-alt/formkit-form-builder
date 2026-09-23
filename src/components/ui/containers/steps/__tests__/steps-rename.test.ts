// @vitest-environment happy-dom
// ═══ H1：步骤条 pane 改名后运行时数据 key 的稳定性 / 唯一性 ═══════════════════════
// 背景/修复思路同 src/components/ui/containers/tabs/__tests__/tabs-rename.test.ts，
// 步骤条一份对照。步骤条本身已经给每个 pane 生成与 label 解耦的稳定 name
// （StepsContainer.vue 的 createStep），这里补的是：
// ① 显式改「名称」（右侧面板真正的数据键编辑）时 FormKit 分组要立即重新挂载；
// ② 双击改名成重复标题要拒绝并提示，不能悄悄产生两个同名步骤。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormBuilder from '@/builder/BuilderMain.vue'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition, LayoutNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 8; i++) await nextTick()
}

function buildField(name: string, label: string): FieldNode {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.name = name
  field.label = label
  return field
}

function buildSinglePaneDef(paneName: string): FormDefinition {
  const pane: LayoutNode = {
    id: 'pane1',
    key: 'pane1',
    category: 'layout',
    type: 'stepsPane',
    renderAs: 'el',
    name: paneName,
    label: '第一步',
    children: [buildField('value', '取值')],
  }
  const steps: LayoutNode = {
    id: 'steps1',
    key: 'steps1',
    category: 'layout',
    type: 'steps',
    renderAs: 'cmp',
    children: [pane],
  }
  return {
    version: DSL_VERSION,
    id: 'steps-rename-test',
    name: 'steps-rename-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [steps],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function buildTwoPaneCanvasDef(): FormDefinition {
  const pane1: LayoutNode = {
    id: 'pane1',
    key: 'pane1',
    category: 'layout',
    type: 'stepsPane',
    renderAs: 'el',
    name: 'step_a',
    label: 'Step 1',
    children: [],
  }
  const pane2: LayoutNode = {
    id: 'pane2',
    key: 'pane2',
    category: 'layout',
    type: 'stepsPane',
    renderAs: 'el',
    name: 'step_b',
    label: 'Step 2',
    children: [],
  }
  const steps: LayoutNode = {
    id: 'steps1',
    key: 'steps1',
    category: 'layout',
    type: 'steps',
    renderAs: 'cmp',
    children: [pane1, pane2],
  }
  return {
    version: DSL_VERSION,
    id: 'steps-dup-test',
    name: 'steps-dup-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [steps],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

const CANVAS_STEPS = '[data-testid^="drop-area"] .n-steps'

describe('H1：步骤条 pane 改名的数据 key', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('显式修改 pane 的数据键（Name）后，FormRenderer 立即用新 key，旧 key 不再存在', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildSinglePaneDef('old_key'),
        modelValue: { old_key: { value: 'hello' } },
      },
    })
    await settle()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('hello')

    await wrapper.setProps({ definition: buildSinglePaneDef('new_key') })
    await settle()

    const afterRename = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as Record<string, unknown>
    expect(afterRename, '旧 key 应立即从表单数据消失').not.toHaveProperty('old_key')
    expect(afterRename, '新 key 应立即出现').toHaveProperty('new_key')

    wrapper.unmount()
  })

  it('双击改名成重复标题被拒绝：标题保持不变，且弹出提示', async () => {
    const wrapper = mount(FormBuilder, {
      props: { modelValue: buildTwoPaneCanvasDef() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()

    const stepsEl = wrapper.find(CANVAS_STEPS)
    expect(stepsEl.exists()).toBe(true)
    const secondStepTitle = stepsEl.findAll('.n-step')[1]!
    await secondStepTitle.trigger('dblclick')
    await settle()

    // 改名编辑面板（标题 + 描述两个输入框）渲染在 .border-dashed 容器里，
    // 不能直接 wrapper.find('input')——整个设计器里还有别的输入框（如侧边栏搜索）
    const titleInput = wrapper.find('.border-dashed input')
    expect(titleInput.exists(), '双击后应出现改名编辑面板').toBe(true)
    await titleInput.setValue('Step 1')
    await titleInput.trigger('keydown', { key: 'Enter' })
    await settle()

    const titles = wrapper
      .find(CANVAS_STEPS)
      .findAll('.n-step-content-header__title')
      .map((n) => n.text())
    expect(titles).toEqual(['Step 1', 'Step 2'])
    expect(document.body.textContent).toContain('已被占用')

    wrapper.unmount()
  })
})
