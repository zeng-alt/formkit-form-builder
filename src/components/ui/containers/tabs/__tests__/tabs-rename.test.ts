// @vitest-environment happy-dom
// ═══ H1：标签页改名后运行时数据 key 的稳定性 / 唯一性 ═══════════════════════════
// 背景（详见规格 H-ui-fixes.md H1）：
// - pane 的运行时数据键来自 formatContainer 包出的 group 节点 name（tabsPaneToSchema
//   读 DSL 节点的 name，未设置时旧实现回退到 label——画布双击改名只改 label，
//   FormKit 分组节点挂载后又不响应 name 变化，导致刷新前后表单数据 key 不一致，
//   两个 pane 改成同名还会互相覆盖）。
// - 修复：① 新建 pane 时即生成与 label 解耦的稳定 name（同 StepsContainer.vue 的
//   做法），画布双击改名只改标题、不改数据键，天然不会因为改标题丢数据；
//   ② 显式修改 pane 的「名称」字段（右侧面板，真正的数据键编辑入口）时，
//   TabsContainerPreview.vue 按数据键绑定 Vue :key，name 变化会强制重新挂载，
//   旧 key 立刻从表单数据消失、新 key 立刻出现；③ 双击改名 / 显式改名都做唯一性
//   校验，拒绝重复并提示，不静默覆盖。
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

// 单 pane 的 tabs 定义：pane 的数据键直接由 DSL 上的 name 决定（右侧面板「名称」编辑
// 的正是这个字段），pane 内一个字段
function buildSinglePaneDef(paneName: string): FormDefinition {
  const pane: LayoutNode = {
    id: 'pane1',
    key: 'pane1',
    category: 'layout',
    type: 'tabsPane',
    renderAs: 'el',
    name: paneName,
    label: '第一页',
    children: [buildField('value', '取值')],
  }
  const tabs: LayoutNode = {
    id: 'tabs1',
    key: 'tabs1',
    category: 'layout',
    type: 'tabs',
    renderAs: 'cmp',
    children: [pane],
  }
  return {
    version: DSL_VERSION,
    id: 'tabs-rename-test',
    name: 'tabs-rename-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [tabs],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

// 两个 pane 的画布定义：不带 name，交给画布新建/双击改名走默认流程（label 即初始展示名）
function buildTwoPaneCanvasDef() {
  const pane1: LayoutNode = {
    id: 'pane1',
    key: 'pane1',
    category: 'layout',
    type: 'tabsPane',
    renderAs: 'el',
    label: 'Tab 1',
    children: [],
  }
  const pane2: LayoutNode = {
    id: 'pane2',
    key: 'pane2',
    category: 'layout',
    type: 'tabsPane',
    renderAs: 'el',
    label: 'Tab 2',
    children: [],
  }
  const tabs: LayoutNode = {
    id: 'tabs1',
    key: 'tabs1',
    category: 'layout',
    type: 'tabs',
    renderAs: 'cmp',
    children: [pane1, pane2],
  }
  const def: FormDefinition = {
    version: DSL_VERSION,
    id: 'tabs-dup-test',
    name: 'tabs-dup-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [tabs],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
  return def
}

const CANVAS_TABS = '[data-testid^="drop-area"] .n-tabs'

describe('H1：标签页 pane 改名的数据 key', () => {
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

    // 模拟右侧面板把 pane 的「名称」从 old_key 改成 new_key（真正的数据键编辑）
    await wrapper.setProps({ definition: buildSinglePaneDef('new_key') })
    await settle()

    const afterRename = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as Record<string, unknown>
    expect(afterRename, '旧 key 应立即从表单数据消失').not.toHaveProperty('old_key')
    expect(afterRename, '新 key 应立即出现').toHaveProperty('new_key')

    wrapper.unmount()
  })

  it('双击改名成重复标题被拒绝：标题保持不变，且弹出提示', async () => {
    const def = buildTwoPaneCanvasDef()
    const wrapper = mount(FormBuilder, {
      props: { modelValue: def },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()

    const tabsEl = wrapper.find(CANVAS_TABS)
    const secondTabLabel = tabsEl.findAll('.tabs-tab-label')[1]!
    await secondTabLabel.trigger('dblclick')
    await settle()
    const input = wrapper.find(`${CANVAS_TABS} .n-tabs-tab__label input`)
    expect(input.exists()).toBe(true)
    await input.setValue('Tab 1')
    await input.trigger('keydown', { key: 'Enter' })
    await settle()

    // 标题应保持原名，不应该出现两个「Tab 1」
    const labels = wrapper
      .find(CANVAS_TABS)
      .findAll('.tabs-tab-label')
      .map((n) => n.text())
    expect(labels).toEqual(['Tab 1', 'Tab 2'])
    // 提示：naive-ui notification 挂载在 body 下的 teleport 容器里
    expect(document.body.textContent).toContain('已被占用')

    wrapper.unmount()
  })
})
