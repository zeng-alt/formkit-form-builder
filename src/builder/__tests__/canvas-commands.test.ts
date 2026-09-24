// @vitest-environment happy-dom
// ═══ D0：画布命令层（use-canvas-commands.ts）══════════════════════════════════════
// 通过完整挂载 BuilderMain 拿到真实的 FormBuilderState + i18n/notification 上下文
// （useCanvasCommands 依赖它们），再用一个不渲染任何内容的哨兵组件把命令对象“捞”出来。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { useFormBuilderState, type FormBuilderState } from '@/state/create-form-builder-state'
import { useCanvasCommands, type CanvasCommands } from '@/builder/composables/use-canvas-commands'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type {
  ContainerNode,
  FieldNode,
  FormDefinition,
  FormNode,
  LayoutNode,
  ValidationRule,
} from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function textField(id: string, label: string): FieldNode {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = id
  field.key = id
  field.name = id
  field.label = label
  return field
}

function buttonGroupNode(id: string, children: FieldNode[]): ContainerNode {
  const node = getElementTypeDef('buttonGroup')!.defaults() as ContainerNode
  node.id = id
  node.key = id
  node.name = id
  node.children = children
  return node
}

function buildDefinition(
  children: FormNode[] = [textField('age', '年龄'), textField('name', '姓名')],
): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'commands-test',
    name: 'commands-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children,
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

let captured: { state: FormBuilderState; commands: CanvasCommands } | null = null
const Harness = defineComponent({
  setup() {
    const state = useFormBuilderState()
    const commands = useCanvasCommands(state)
    captured = { state, commands }
    return () => null
  },
})

// 选中态切到某些字段类型（如 select）会触发右侧属性面板异步加载对应编辑器组件
// （defineAsyncComponent 懒加载链路较深，如 SelectEditor → OptionsSourceTabs →
// DictionaryPickerModal），若在这条 import 链落地前就 unmount，vitest 环境被回收后
// 该 Promise 才 resolve 会报未处理的 rejection——统一在 unmount 前等它落地。
async function teardown(wrapper: ReturnType<typeof mount>) {
  await vi.dynamicImportSettled()
  wrapper.unmount()
}

function setup(def: FormDefinition) {
  captured = null
  const wrapper = mount(BuilderMain, {
    props: { modelValue: def },
    slots: { 'header-left': Harness },
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
  })
  return wrapper
}

describe('D0：画布命令层', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('duplicate：在原位置后插入副本并选中，name/label 都重新生成', async () => {
    const wrapper = setup(buildDefinition())
    await settle()
    const { state, commands } = captured!

    commands.duplicate(['age'])
    await settle()

    const root = state.formDefinition.value.root.children
    expect(root).toHaveLength(3)
    expect(root[0]?.key).toBe('age')
    const clone = root[1] as FieldNode
    expect(clone.label).toBe('年龄 副本')
    expect(clone.name).not.toBe('age')
    expect(state.selectedKey.value).toBe(clone.key)

    await teardown(wrapper)
  })

  it('remove：批量删除多个 key，一次提交（一次 undo 即可全部恢复）', async () => {
    const wrapper = setup(buildDefinition())
    await settle()
    const { state, commands } = captured!

    commands.remove(['age', 'name'])
    await settle()
    expect(state.formDefinition.value.root.children).toHaveLength(0)

    state.undo()
    await settle()
    expect(state.formDefinition.value.root.children.map((n) => n.key)).toEqual(['age', 'name'])

    await teardown(wrapper)
  })

  it('moveUp / moveDown：交换同父级下的相邻顺序', async () => {
    const wrapper = setup(buildDefinition())
    await settle()
    const { state, commands } = captured!

    expect(commands.canMoveUp('age')).toBe(false)
    expect(commands.canMoveDown('age')).toBe(true)

    commands.moveDown('age')
    await settle()
    expect(state.formDefinition.value.root.children.map((n) => n.key)).toEqual(['name', 'age'])

    commands.moveUp('age')
    await settle()
    expect(state.formDefinition.value.root.children.map((n) => n.key)).toEqual(['age', 'name'])

    await teardown(wrapper)
  })

  it('copy + paste：粘贴到根末尾，key/name 重新生成，粘贴后选中新节点', async () => {
    const wrapper = setup(buildDefinition())
    await settle()
    const { state, commands } = captured!

    commands.copy(['age'])
    await commands.paste()
    await settle()

    const root = state.formDefinition.value.root.children
    expect(root).toHaveLength(3)
    const pasted = root[2] as FieldNode
    expect(pasted.key).not.toBe('age')
    expect(pasted.label).toBe('年龄')
    expect(state.selectedKey.value).toBe(pasted.key)

    await teardown(wrapper)
  })

  it('paste：选中容器时粘贴到容器内末尾', async () => {
    const card = getElementTypeDef('card')!.defaults() as LayoutNode
    card.id = 'card1'
    card.key = 'card1'
    card.name = 'card1'
    card.children = [textField('inner', '内部字段')]
    const wrapper = setup(buildDefinition([textField('age', '年龄'), card]))
    await settle()
    const { state, commands } = captured!

    commands.copy(['age'])
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'card1'
    await commands.paste()
    await settle()

    const cardNode = state.formDefinition.value.root.children.find(
      (n) => n.key === 'card1',
    ) as ContainerNode
    expect(cardNode.children).toHaveLength(2)
    expect(cardNode.children[1]?.label).toBe('年龄')

    await teardown(wrapper)
  })

  it('paste：按钮组只收按钮，粘贴普通字段被拒绝', async () => {
    const bg = buttonGroupNode('bg1', [])
    const wrapper = setup(buildDefinition([textField('age', '年龄'), bg]))
    await settle()
    const { state, commands } = captured!

    commands.copy(['age'])
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'bg1'
    await commands.paste()
    await settle()

    const bgNode = state.formDefinition.value.root.children.find(
      (n) => n.key === 'bg1',
    ) as ContainerNode
    expect(bgNode.children ?? []).toHaveLength(0)

    await teardown(wrapper)
  })

  it('canWrap：选中项包含步骤条时返回 false', async () => {
    const steps = getElementTypeDef('steps')!.defaults() as LayoutNode
    steps.id = 'steps1'
    steps.key = 'steps1'
    steps.name = 'steps1'
    const wrapper = setup(buildDefinition([textField('age', '年龄'), steps]))
    await settle()
    const { commands } = captured!

    expect(commands.canWrap(['age'])).toBe(true)
    expect(commands.canWrap(['steps1'])).toBe(false)

    await teardown(wrapper)
  })

  it('wrapIn：把选中的兄弟元素包进新卡片，新容器占原位置，子元素保留原顺序', async () => {
    const wrapper = setup(buildDefinition())
    await settle()
    const { state, commands } = captured!

    commands.wrapIn(['age', 'name'], 'card')
    await settle()

    const root = state.formDefinition.value.root.children
    expect(root).toHaveLength(1)
    const card = root[0] as ContainerNode
    expect(card.type).toBe('card')
    expect(card.children.map((c) => c.key)).toEqual(['age', 'name'])
    expect(state.selectedKey.value).toBe(card.key)

    await teardown(wrapper)
  })

  it('convertTo：文本类之间转换，保留标签/占位符/校验，不兼容的规则被去掉', async () => {
    const field = getElementTypeDef('text')!.defaults() as FieldNode
    field.id = 'f1'
    field.key = 'f1'
    field.name = 'f1'
    field.label = '姓名'
    field.props = { ...field.props, placeholder: '请输入姓名' }
    field.validation = [{ rule: 'required' }, { rule: 'email' }] as ValidationRule[]
    const wrapper = setup(buildDefinition([field]))
    await settle()
    const { state, commands } = captured!

    expect(commands.convertTargets('f1')).toEqual(
      expect.arrayContaining(['textarea', 'email', 'url', 'tel', 'password', 'richText']),
    )

    commands.convertTo('f1', 'textarea')
    await settle()

    const next = state.formDefinition.value.root.children.find((n) => n.key === 'f1') as FieldNode
    expect(next.type).toBe('textarea')
    expect(next.label).toBe('姓名')
    expect(next.props?.placeholder).toBe('请输入姓名')
    // email 规则不支持 textarea，required 支持，应只保留 required
    expect(next.validation?.map((r) => r.rule)).toEqual(['required'])
    expect(state.selectedKey.value).toBe('f1')

    await teardown(wrapper)
  })

  it('convertTo：默认值类型不兼容时清空为目标类型默认值', async () => {
    const field = getElementTypeDef('checkbox')!.defaults() as FieldNode
    field.id = 'c1'
    field.key = 'c1'
    field.name = 'c1'
    field.value = ['One']
    const wrapper = setup(buildDefinition([field]))
    await settle()
    const { state, commands } = captured!

    commands.convertTo('c1', 'select')
    await settle()

    const next = state.formDefinition.value.root.children.find((n) => n.key === 'c1') as FieldNode
    expect(next.type).toBe('select')
    // checkbox 的数组默认值对 select 不兼容，应被清空（不再是数组）
    expect(Array.isArray(next.value)).toBe(false)

    await teardown(wrapper)
  })

  it('selectItem：Shift 多选同一父级下的兄弟元素，普通点击回到单选', async () => {
    const wrapper = setup(buildDefinition())
    await settle()
    const { state, commands } = captured!

    commands.selectItem('age', { shift: false, multi: false })
    await settle()
    expect(state.selectedKeys.value).toEqual(['age'])

    commands.selectItem('name', { shift: true, multi: false })
    await settle()
    expect(state.selectedKeys.value.sort()).toEqual(['age', 'name'])
    expect(state.selectedKey.value).toBe('name')

    commands.selectItem('age', { shift: false, multi: false })
    await settle()
    expect(state.selectedKeys.value).toEqual(['age'])

    await teardown(wrapper)
  })

  it('selectItem：跨容器 Shift 点击退化为单选', async () => {
    const card = getElementTypeDef('card')!.defaults() as LayoutNode
    card.id = 'card1'
    card.key = 'card1'
    card.name = 'card1'
    card.children = [textField('inner', '内部字段')]
    const wrapper = setup(buildDefinition([textField('age', '年龄'), card]))
    await settle()
    const { state, commands } = captured!

    commands.selectItem('age', { shift: false, multi: false })
    await settle()
    commands.selectItem('inner', { shift: true, multi: false })
    await settle()

    expect(state.selectedKeys.value).toEqual(['inner'])
    expect(state.selectedKey.value).toBe('inner')

    await teardown(wrapper)
  })

  it('selectAllRoot / clearSelection', async () => {
    const wrapper = setup(buildDefinition())
    await settle()
    const { state, commands } = captured!

    commands.selectAllRoot()
    await settle()
    expect(state.selectedKeys.value.sort()).toEqual(['age', 'name'])

    commands.clearSelection()
    await settle()
    expect(state.selectedKeys.value).toEqual([])
    expect(state.selectedTarget.value).toBe('form')

    await teardown(wrapper)
  })
})
