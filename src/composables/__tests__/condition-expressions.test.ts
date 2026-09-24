// @vitest-environment happy-dom
// ═══ G：条件必填 / 条件禁用 / 条件只读——编辑器读写单测 ═══════════════════════════
// IfConditionEditor.vue 只是这几个 computed 的薄 UI 壳（开关 + 只读输入框 + 铅笔弹窗），
// 真正的读写逻辑在 useFormField() 里，这里直接测 composable 层，覆盖面更精确、更快。
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { provideFormBuilderState, createFormBuilderState } from '@/state/create-form-builder-state'
import { useFormField } from '@/composables/form-fields'
import { parseExprString } from '@/dsl'
import { DSL_VERSION } from '@/types/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

function field(id: string, extra: Partial<FieldNode> = {}): FieldNode {
  return {
    id,
    key: id,
    category: 'field',
    type: 'text',
    renderAs: 'cmp',
    name: id,
    ...extra,
  } as FieldNode
}

function buildDef(): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'f',
    name: 'f',
    root: {
      id: 'root',
      key: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [field('a'), field('b', { validation: [{ rule: 'required' }] })],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function mountWithState() {
  const state = createFormBuilderState()
  state.setFormDefinition(buildDef(), { resetHistory: true })
  state.selectedKey.value = 'a'

  // provide 与 inject 分处父子两个组件（同一 setup 内自我 provide/inject 在
  // @vue/test-utils 的匿名根包裹下不可靠），与 form-fields-rename.test.ts 的写法一致。
  let api!: ReturnType<typeof useFormField>
  const Consumer = defineComponent({
    setup() {
      api = useFormField()
      return () => h('div')
    },
  })
  const Host = defineComponent({
    setup() {
      provideFormBuilderState(state)
      return () => h(Consumer)
    },
  })
  mount(Host)
  return { state, api }
}

describe('useFormField()：条件必填 / 条件禁用 / 条件只读', () => {
  it('requiredIfExpression 写入可读源码，落到 node.requiredIf 的 Expr AST', () => {
    const { state, api } = mountWithState()

    api.requiredIfExpression.value = '$other == "yes"'

    const node = state.formDefinition.value.root.children[0] as FieldNode
    expect(node.requiredIf).toEqual(parseExprString('$other == "yes"'))
    // get 读回来的是可读源码，不是编译后的 helper 调用字符串
    expect(api.requiredIfExpression.value).toBe('$other == "yes"')

    // 清空即删键
    api.requiredIfExpression.value = ''
    expect((state.formDefinition.value.root.children[0] as FieldNode).requiredIf).toBeUndefined()
  })

  it('disabledIfExpression / readonlyIfExpression 各自独立写入，互不影响', () => {
    const { state, api } = mountWithState()

    api.disabledIfExpression.value = '$flag == "1"'
    api.readonlyIfExpression.value = '$flag == "2"'

    const node = state.formDefinition.value.root.children[0] as FieldNode
    expect(node.disabledIf).toEqual(parseExprString('$flag == "1"'))
    expect(node.readonlyIf).toEqual(parseExprString('$flag == "2"'))
    // visibleIf 未被写过，保持未设置
    expect(node.visibleIf).toBeUndefined()
  })

  it('hasStaticRequiredRule：字段已有静态 required 规则时为 true，供编辑器显示提示', () => {
    const { state, api } = mountWithState()
    expect(api.hasStaticRequiredRule.value).toBe(false)

    state.selectedKey.value = 'b'
    expect(api.hasStaticRequiredRule.value).toBe(true)
  })
})
