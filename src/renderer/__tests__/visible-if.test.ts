// @vitest-environment happy-dom
// ═══ 真实渲染集成测试：容器内字段的 visibleIf ═══════════════════════════════════
// 仓库其余测试都是纯函数级（dslToSchema / exprToJs 等），从未真的把 FormRenderer
// 挂载到 DOM 里跑过——这正是"生成的 schema 在真实渲染环境里其实不工作"这类 bug
// （容器内 FormKitSchema 拿不到表单数据，visibleIf 恒为 false）能潜伏很久的原因。
// 这里用 @vue/test-utils + happy-dom 真实挂载 FormRenderer，验证 visibleIf 在
// 根级字段与容器（card）内字段上都能按表单数据正确切换显隐。
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { Expr, FieldNode, FormDefinition, LayoutNode } from '@/types/dsl'

// eq($flag, 'yes')：与容器/根级两个字段共用同一份条件表达式 AST
const visibleIfFlagIsYes: Expr = {
  type: 'call',
  fn: 'eq',
  args: [
    { type: 'field', name: 'flag' },
    { type: 'literal', value: 'yes' },
  ],
}

// 构造一份 FormDefinition：根级 flag 字段 + 根级对照字段（label: RootOnly）+
// card 容器（内含 label: InCard 字段），两个受控字段用同一条 visibleIf。
// label 文案刻意不互为子串，避免 wrapper.text().toContain 断言互相误判。
function buildDefinition(): FormDefinition {
  const flagField = getElementTypeDef('text')!.defaults() as FieldNode
  flagField.name = 'flag'
  flagField.label = 'Flag'

  const rootField = getElementTypeDef('text')!.defaults() as FieldNode
  rootField.name = 'rootField'
  rootField.label = 'RootOnly'
  rootField.visibleIf = visibleIfFlagIsYes

  const cardField = getElementTypeDef('text')!.defaults() as FieldNode
  cardField.name = 'cardField'
  cardField.label = 'InCard'
  cardField.visibleIf = visibleIfFlagIsYes

  const cardNode = getElementTypeDef('card')!.defaults() as LayoutNode
  cardNode.children = [cardField]

  return {
    version: DSL_VERSION,
    id: 'visible-if-test-form',
    name: 'visible-if-test-form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [flagField, rootField, cardNode],
    },
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
  }
}

// FormKit 的 schema if 条件、useExprRun 的依赖求值都要等响应式更新在下一轮渲染
// 后才落到 DOM；多等几个 tick 让 FormKit settle，避免测试因时序偶发失败。
const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

describe('FormRenderer 真实渲染：visibleIf（根级 vs 容器内）', () => {
  it('flag=no 时，根级字段与容器内字段都应隐藏', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: { flag: 'no' } },
    })
    await settle()

    expect(wrapper.text()).not.toContain('RootOnly')
    expect(wrapper.text()).not.toContain('InCard')

    wrapper.unmount()
  })

  it('flag=yes 时，根级字段与容器内字段都应显示', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(), modelValue: { flag: 'no' } },
    })
    await settle()
    expect(wrapper.text()).not.toContain('RootOnly')
    expect(wrapper.text()).not.toContain('InCard')

    await wrapper.setProps({ modelValue: { flag: 'yes' } })
    await settle()

    // 根级字段：修复前后都应通过（对照组，证明测试本身有效）
    expect(wrapper.text()).toContain('RootOnly')
    // 容器（card）内字段：修复前——容器内嵌套 FormKitSchema 只拿到 EXPR_SCHEMA_HELPERS，
    // 没有表单数据，$flag 恒为 undefined，if 恒不成立——本用例失败；修复后应通过。
    expect(wrapper.text()).toContain('InCard')

    wrapper.unmount()
  })
})
