// @vitest-environment happy-dom
// ═══ A3：折叠面板容器（collapse）画布行为 ═══════════════════════════════════════
// 挂载方式照 data-table-canvas.test.ts；容器整体行为（选中/复制/子项 DnD 提交）
// 与 card 一致，这里重点覆盖 collapse 特有的部分：
//   - 空容器也要渲染带 data-collapse-key 的拖放区（否则拖入的字段提交不了）
//   - 画布上始终展开（不受 defaultExpanded=false 影响），并显示「默认收起」标签
//   - 删除子项会经 onUpdateModelValue → updateContainerChildren 写回 DSL 的
//     children（与拖入字段落地时走的是同一条提交路径）
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { ContainerNode, FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

function textField(id: string, label: string): FieldNode {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = id
  field.key = id
  field.name = id
  field.label = label
  return field
}

function buildDefinition(
  opts: {
    children?: FieldNode[]
    defaultExpanded?: boolean
  } = {},
): FormDefinition {
  const node = getElementTypeDef('collapse')!.defaults() as ContainerNode
  node.id = 'panel1'
  node.key = 'panel1'
  node.name = 'panel_a'
  node.label = '基本信息'
  node.children = opts.children ?? []
  if (opts.defaultExpanded !== undefined) {
    node.props = { ...node.props, defaultExpanded: opts.defaultExpanded }
  }
  return {
    version: DSL_VERSION,
    id: 'collapse-canvas-test',
    name: 'collapse-canvas-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [node],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function getState(wrapper: ReturnType<typeof mount>): FormBuilderState {
  const provides = (wrapper.vm.$ as any).provides
  const state = provides?.[BUILDER_STATE_KEY as unknown as string] as FormBuilderState
  expect(state).toBeTruthy()
  return state
}

describe('折叠面板画布', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('空容器也渲染带所属折叠面板 key 的拖放区', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()

    const zone = wrapper.find('[data-collapse-key="panel1"]')
    expect(zone.exists()).toBe(true)
    expect(zone.findAll('[data-canvas-item="true"]')).toHaveLength(0)

    wrapper.unmount()
  })

  it('画布上始终展开：即便 defaultExpanded=false，子字段依旧可见，并显示「默认收起」标签', async () => {
    const wrapper = mount(BuilderMain, {
      props: {
        modelValue: buildDefinition({
          children: [textField('f1', '姓名')],
          defaultExpanded: false,
        }),
      },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()

    expect(wrapper.text()).toContain('姓名')
    expect(wrapper.text()).toContain('默认收起')

    wrapper.unmount()
  })

  it('删除子项：经 updateContainerChildren 写回 DSL 的 children', async () => {
    const wrapper = mount(BuilderMain, {
      props: {
        modelValue: buildDefinition({
          children: [textField('f1', '姓名'), textField('f2', '年龄')],
        }),
      },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    // D3：删除按钮改到浮动工具条，只在选中单个元素时出现，先选中 f1
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'f1'
    await settle()

    const item = wrapper.find('[data-item-key="f1"]')
    expect(item.exists()).toBe(true)
    const deleteBtn = item.find('button[aria-label="删除字段"]')
    expect(deleteBtn.exists()).toBe(true)
    await deleteBtn.trigger('click')
    await settle()

    const panel = state.formDefinition.value.root.children.find(
      (n) => n.key === 'panel1',
    ) as ContainerNode
    expect(panel.children).toHaveLength(1)
    expect((panel.children[0] as FieldNode).name).toBe('f2')

    wrapper.unmount()
  })
})
