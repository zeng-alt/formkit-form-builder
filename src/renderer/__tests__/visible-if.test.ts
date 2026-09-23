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
    settings: { labelWidth: 80, labelAlign: 'top' },
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

// ─── dataStructure: 'nested' ────────────────────────────────────────────────────
// 上面这组用例的受控字段（$flag）在根级，根级字段在 dslToOutputSchema 里从不被
// wrapNodeWithGroup 包裹（只有容器/布局节点才会被包成 group），所以它在 nested
// 模式下仍然直接躺在表单数据根层——不能暴露 nested 模式的 bug。
// nested 模式真正的坑在于：card 容器被包进同名 group 后，容器内字段的数据落在
// `{ card: { 字段名: 值 } } }` 这样的嵌套结构里，而容器组件（CardContainerPreview）
// 内部再渲染一层 FormKitSchema 时，仍然把"整棵根表单数据"原样传给它求值 $token——
// 于是同一个 card 容器内，一个字段的 visibleIf / expr 引用同容器内的另一个字段
// （字段名不在根层，只有進 group 后才能找到）就会解析不到。用同一个 card 容器内
// 两个字段互相引用来复现。
function buildNestedVisibleIfDefinition(): FormDefinition {
  const ctrlField = getElementTypeDef('text')!.defaults() as FieldNode
  ctrlField.name = 'ctrl'
  ctrlField.label = 'Ctrl'

  const targetField = getElementTypeDef('text')!.defaults() as FieldNode
  targetField.name = 'target'
  targetField.label = 'TargetInCard'
  targetField.visibleIf = {
    type: 'call',
    fn: 'eq',
    args: [
      { type: 'field', name: 'ctrl' },
      { type: 'literal', value: 'yes' },
    ],
  }

  const cardNode = getElementTypeDef('card')!.defaults() as LayoutNode
  cardNode.children = [ctrlField, targetField]

  return {
    version: DSL_VERSION,
    id: 'nested-visible-if-test-form',
    name: 'nested-visible-if-test-form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [cardNode],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

describe('FormRenderer 真实渲染：dataStructure nested 下容器内字段互相引用', () => {
  it('visibleIf：同一 card 内，ctrl=yes 应显示 target 字段', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildNestedVisibleIfDefinition(),
        modelValue: { card: { ctrl: 'yes' } },
        dataStructure: 'nested',
      },
    })
    await settle()

    // 修复前：card 容器内嵌套渲染的 FormKitSchema 收到的是"整棵根数据"
    // { card: { ctrl: 'yes' } }，$ctrl 在根层取不到（真正的值嵌在 card 键下面），
    // if 恒不成立——本用例失败；修复后 lookupFieldValue 会在树里找到 ctrl，通过。
    expect(wrapper.text()).toContain('TargetInCard')

    wrapper.unmount()
  })

  it('visibleIf：同一 card 内，ctrl=no 时 target 字段应隐藏', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildNestedVisibleIfDefinition(),
        modelValue: { card: { ctrl: 'no' } },
        dataStructure: 'nested',
      },
    })
    await settle()

    expect(wrapper.text()).not.toContain('TargetInCard')

    wrapper.unmount()
  })
})

// ─── expr 计算字段：nested 模式下同容器内互相引用 ─────────────────────────────────
function buildNestedExprDefinition(): FormDefinition {
  const priceField = getElementTypeDef('number')!.defaults() as FieldNode
  priceField.name = 'price'
  priceField.label = 'Price'

  const totalField = getElementTypeDef('number')!.defaults() as FieldNode
  totalField.name = 'total'
  totalField.label = 'Total'
  totalField.expr = '$price * 2'

  const cardNode = getElementTypeDef('card')!.defaults() as LayoutNode
  cardNode.children = [priceField, totalField]

  return {
    version: DSL_VERSION,
    id: 'nested-expr-test-form',
    name: 'nested-expr-test-form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [cardNode],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

describe('FormRenderer 真实渲染：expr 计算字段在 nested 模式下的依赖解析', () => {
  it('total = $price * 2：同一 card 内取到正确的 price 依赖值', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildNestedExprDefinition(),
        modelValue: { card: { price: 5 } },
        dataStructure: 'nested',
      },
    })
    await settle()
    await settle()

    // card 内两个字段渲染顺序固定为 price、total，按顺序取第二个 input 定位 total
    const inputs = wrapper.findAll('input')
    const totalValue = inputs[1]?.element.value

    // 修复前：useExprRun 用 formData.value['price'] 读依赖，nested 模式下 price
    // 实际落在 formData.value.card.price，根层取不到 → undefined → toNum 按 0
    // 处理 → total 算成 0（错误但"写入成功"，不是没写入）；修复后应为 5*2=10。
    expect(totalValue).toBe('10')

    wrapper.unmount()
  })
})
