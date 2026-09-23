// @vitest-environment happy-dom
// ═══ 回归复现：原地修改 reactive definition 后 FormRenderer 不再更新（规格 D） ═══════
// 背景：a08a08d 把 dslToSchema 改成了模块级 WeakMap<FormNode, SchemaNode> 按节点身份
// 缓存，入口 toRaw()。外部把 definition 包在 reactive() 里原地修改某个节点时，
// toRaw 让 computed 不再追踪嵌套字段、节点引用不变又命中了旧缓存——FormRenderer
// 因此不再更新。这里复现规格文档给出的场景，在修复后应该通过。
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 6; i++) await nextTick()
}

describe('FormRenderer：原地修改 reactive definition 后应更新', () => {
  it('def.root.children[0].label 原地改写后，渲染出的 label 文案跟着变', async () => {
    const f = getElementTypeDef('text')!.defaults() as FieldNode
    f.name = 'a'
    f.label = 'Old'
    const def = reactive<FormDefinition>({
      version: DSL_VERSION,
      id: 'x',
      name: 'x',
      root: {
        id: 'root',
        category: 'container',
        type: 'group',
        renderAs: 'formkit',
        dataType: 'object',
        children: [f],
      } as any,
      settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
    })

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {} },
    })
    await settle()

    expect(wrapper.text()).toContain('Old')
    expect(wrapper.text()).not.toContain('New')

    ;(def.root.children[0] as FieldNode).label = 'New'
    await settle()

    expect(wrapper.text()).toContain('New')
    expect(wrapper.text()).not.toContain('Old')

    wrapper.unmount()
  })

  it('容器内嵌套字段原地改写同样生效', async () => {
    const nested = getElementTypeDef('text')!.defaults() as FieldNode
    nested.name = 'nested'
    nested.label = 'Nested Old'
    const group = {
      id: 'g',
      key: 'g',
      category: 'container' as const,
      type: 'group' as const,
      renderAs: 'formkit' as const,
      dataType: 'object' as const,
      name: 'g',
      children: [nested],
    }
    const def = reactive<FormDefinition>({
      version: DSL_VERSION,
      id: 'x2',
      name: 'x2',
      root: {
        id: 'root',
        category: 'container',
        type: 'group',
        renderAs: 'formkit',
        dataType: 'object',
        children: [group],
      } as any,
      settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
    })

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {} },
    })
    await settle()

    expect(wrapper.text()).toContain('Nested Old')

    const rootChildren = def.root.children as any[]
    ;(rootChildren[0].children[0] as FieldNode).label = 'Nested New'
    await settle()

    expect(wrapper.text()).toContain('Nested New')
    expect(wrapper.text()).not.toContain('Nested Old')

    wrapper.unmount()
  })
})
