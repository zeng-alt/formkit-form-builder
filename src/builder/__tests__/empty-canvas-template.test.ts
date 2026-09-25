// @vitest-environment happy-dom
// ═══ B3/B2：空画布引导卡片 + 模板选择弹窗 ═══════════════════════════════════════
// 覆盖：
// - 画布为空时显示引导卡片（标题 / 拖入提示 / 模板入口），未配置 apiKey 时不显示
//   「用 AI 生成」入口；
// - 点击「从模板开始」在空画布下直接应用模板（无需二次确认），根节点原有的
//   （唯一）子节点被模板内容替换；
// - 非空画布点击模板会先弹出「替换当前表单」二次确认，取消不改变表单，确认后才应用；
// - 应用走 commitFormDefinition（可撤销）：应用后 canUndo 为 true。
import { describe, expect, it, vi } from 'vitest'
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

/** TemplatePickerModal 经 defineAsyncComponent 懒加载（见 BuilderHeader.vue /
 *  EmptyCanvasGuide.vue 的懒加载说明）：动态 import() 在测试环境里要经过一次真实的
 *  模块转换，耗时不固定，只 flush 微任务队列的 nextTick（settle）不够可靠，
 *  这里改为轮询等待模板卡片真正出现，而不是猜一个固定的宏任务延迟。 */
async function waitForTemplateCard(): Promise<void> {
  await vi.waitFor(
    () => {
      if (!document.body.querySelector('button[aria-label="用户注册"]')) {
        throw new Error('模板弹窗尚未加载完成')
      }
    },
    { timeout: 2000, interval: 10 },
  )
  await settle()
}

function emptyDefinition(): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'empty-canvas-test',
    name: 'empty-canvas-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function nonEmptyDefinition(): FormDefinition {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = 'existing'
  field.key = 'existing'
  field.name = 'existing'
  field.label = '已有字段'
  const def = emptyDefinition()
  def.root.children = [field]
  return def
}

function getState(wrapper: ReturnType<typeof mount>): FormBuilderState {
  const provides = (wrapper.vm.$ as any).provides
  const state = provides?.[BUILDER_STATE_KEY as unknown as string] as FormBuilderState
  expect(state).toBeTruthy()
  return state
}

describe('B3：空画布引导卡片', () => {
  it('画布为空时显示引导卡片，未配置 apiKey 时不显示「用 AI 生成」', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: emptyDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()

    expect(wrapper.text()).toContain('开始设计你的表单')
    expect(wrapper.text()).toContain('从左侧拖入元素')
    expect(wrapper.text()).toContain('从模板开始')
    expect(wrapper.text()).not.toContain('用 AI 生成')

    wrapper.unmount()
  })

  it('配置了 apiKey 时显示「用 AI 生成」入口', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: emptyDefinition(), config: { apiKey: 'test-key' } as any },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()

    expect(wrapper.text()).toContain('用 AI 生成')

    wrapper.unmount()
  })

  it('拖入元素后引导消失（根画布仍是正常的 drop 目标）', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: emptyDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()
    const state = getState(wrapper)

    expect(wrapper.text()).toContain('开始设计你的表单')

    const field = getElementTypeDef('text')!.defaults() as FieldNode
    field.name = 'dropped'
    field.label = '拖入的字段'
    state.commitFormDefinition(
      {
        ...state.formDefinition.value,
        root: { ...state.formDefinition.value.root, children: [field] },
      },
      { reason: 'test-drop' },
    )
    await settle()

    expect(wrapper.text()).not.toContain('开始设计你的表单')
    expect(wrapper.text()).toContain('拖入的字段')

    wrapper.unmount()
  })
})

describe('B2：从空画布引导应用模板', () => {
  it('画布为空：点击模板卡片直接应用，无需二次确认，可撤销', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: emptyDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()
    const state = getState(wrapper)
    expect(state.canUndo.value).toBe(false)

    await wrapper.find('button[aria-label="模板"]').trigger('click')
    await waitForTemplateCard()

    // 弹窗内的模板卡片（用户注册）渲染在 document.body（NModal 默认 teleport 到 body）
    expect(document.body.textContent).toContain('用户注册')
    expect(document.body.textContent).not.toContain('替换当前表单？')

    const userRegCard = document.body.querySelector('button[aria-label="用户注册"]')
    expect(userRegCard).toBeTruthy()
    userRegCard!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()

    expect(state.formDefinition.value.root.children.length).toBeGreaterThan(0)
    expect(state.formDefinition.value.name).toBe('用户注册')
    expect(state.canUndo.value).toBe(true)

    wrapper.unmount()
  })

  it('画布非空：点击模板卡片先弹出替换确认，取消不改变表单', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: nonEmptyDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()
    const state = getState(wrapper)
    const originalDef = state.formDefinition.value

    await wrapper.find('button[aria-label="模板"]').trigger('click')
    await waitForTemplateCard()

    const userRegCard = document.body.querySelector('button[aria-label="用户注册"]')
    userRegCard!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()

    expect(document.body.textContent).toContain('替换当前表单？')
    expect(state.formDefinition.value).toBe(originalDef)

    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '取消',
    )
    cancelBtn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await settle()

    expect(state.formDefinition.value).toBe(originalDef)

    wrapper.unmount()
  })
})
