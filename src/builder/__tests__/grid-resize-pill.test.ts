// @vitest-environment happy-dom
// ═══ K1：调宽把手（方案 B 胶囊）组件层测试 ═══════════════════════════════════════
// 纯逻辑（取整/上下限/撞限只触发一次）见 use-grid-span-resize.test.ts；这里覆盖
// 真实挂载后才能验证的部分：键盘 ←/→ 调宽、双击恢复整行、aria 值、拖动结束后
// body 的光标/选区样式被正确恢复。
import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function textField(id: string, label: string, outerClass?: string): FieldNode {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = id
  field.key = id
  field.name = id
  field.label = label
  if (outerClass) field.outerClass = outerClass
  return field
}

function buildDefinition(): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'resize-pill-test',
    name: 'resize-pill-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [textField('a', 'A', 'col-span-6'), textField('b', 'B', 'col-span-6')],
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

function pillEl(wrapper: ReturnType<typeof mount>, key: string) {
  const li = wrapper.find(`[data-item-key="${key}"]`)
  expect(li.exists(), `应能找到 __key=${key} 的画布条目`).toBe(true)
  const pill = li.find('[role="slider"]')
  expect(pill.exists(), `条目 ${key} 应有可调宽的把手（role=slider）`).toBe(true)
  return pill
}

function outerClassOf(state: FormBuilderState, key: string): string | undefined {
  return state.formDefinition.value.root.children.find((n) => n.key === key)?.outerClass
}

describe('K1：调宽把手', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  it('把手带正确的 role/aria 值', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()

    const pill = pillEl(wrapper, 'a')
    expect(pill.attributes('role')).toBe('slider')
    expect(pill.attributes('tabindex')).toBe('0')
    expect(pill.attributes('aria-valuemin')).toBe('2')
    expect(pill.attributes('aria-valuemax')).toBe('12')
    expect(pill.attributes('aria-valuenow')).toBe('6')

    wrapper.unmount()
  })

  it('聚焦把手后按 ←：col-span 减 1，走提交路径（可被 Ctrl+Z 撤销）', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const pill = pillEl(wrapper, 'a')
    await pill.trigger('keydown', { key: 'ArrowLeft' })
    await settle()

    expect(outerClassOf(state, 'a')).toBe('col-span-5')
    expect(pillEl(wrapper, 'a').attributes('aria-valuenow')).toBe('5')

    // 走的是与拖动结束相同的提交路径：应可被 Ctrl+Z 撤销
    await pill.trigger('keydown', { key: 'z', ctrlKey: true })
    await settle()
    expect(outerClassOf(state, 'a')).toBe('col-span-6')

    wrapper.unmount()
  })

  it('聚焦把手后按 →：col-span 加 1', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const pill = pillEl(wrapper, 'a')
    await pill.trigger('keydown', { key: 'ArrowRight' })
    await settle()

    expect(outerClassOf(state, 'a')).toBe('col-span-7')

    wrapper.unmount()
  })

  it('按 ← 触到下限（2 列）后不再继续减小', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const pill = pillEl(wrapper, 'a')
    for (let i = 0; i < 10; i++) {
      await pill.trigger('keydown', { key: 'ArrowLeft' })
    }
    await settle()

    expect(outerClassOf(state, 'a')).toBe('col-span-2')

    wrapper.unmount()
  })

  it('聚焦把手时 Delete/Backspace 仍能删除选中元素（不被把手的键盘处理拦截）', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'a'
    await settle()

    const pill = pillEl(wrapper, 'a')
    await pill.trigger('keydown', { key: 'Delete' })
    await settle()

    expect(state.formDefinition.value.root.children.some((n) => n.key === 'a')).toBe(false)

    wrapper.unmount()
  })

  it('双击把手：恢复整行（12 列），可撤销', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()
    const state = getState(wrapper)

    const pill = pillEl(wrapper, 'a')
    await pill.trigger('dblclick')
    await settle()

    // DSL 层把"默认 col-span-12"当作无显式宽度处理，往返时不写 outerClass
    // （见 src/dsl/convert/shared.ts parseOuterClass 的注释），因此恢复整行后
    // outerClass 可能是 undefined 也可能是显式的 'col-span-12'，两者语义相同
    expect(outerClassOf(state, 'a') ?? 'col-span-12').toBe('col-span-12')
    expect(pillEl(wrapper, 'a').attributes('aria-valuenow')).toBe('12')

    await pill.trigger('keydown', { key: 'z', ctrlKey: true })
    await settle()
    expect(outerClassOf(state, 'a')).toBe('col-span-6')

    wrapper.unmount()
  })

  it('拖动开始 → 结束：body 光标/选区样式被锁定又恢复', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()

    expect(document.body.style.cursor).toBe('')

    const pill = pillEl(wrapper, 'a')
    await pill.trigger('pointerdown', { pointerId: 7, clientX: 100, clientY: 50 })
    await settle()

    expect(document.body.style.cursor).toBe('ew-resize')
    expect(document.body.style.userSelect).toBe('none')

    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: 100, clientY: 50 }))
    await settle()

    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')

    wrapper.unmount()
  })

  it('拖动中途组件卸载：body 光标/选区样式也会被恢复', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()

    const pill = pillEl(wrapper, 'a')
    await pill.trigger('pointerdown', { pointerId: 9, clientX: 100, clientY: 50 })
    await settle()
    expect(document.body.style.cursor).toBe('ew-resize')

    wrapper.unmount()

    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })
})
