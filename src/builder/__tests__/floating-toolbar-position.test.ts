// @vitest-environment happy-dom
// ═══ I3：浮动工具条贴近画布顶部时改贴元素内部 ══════════════════════════════════
// happy-dom 不跑真实布局引擎（getBoundingClientRect 恒为全零矩形），没法验证真实
// 像素级裁剪，这里改用 hover-feedback.test.ts 同款手法——直接给选中元素的 li 打桩
// getBoundingClientRect，并打桩 document.elementFromPoint 模拟"外侧位置是否被真实
// 渲染出来"，只验证 CanvasFloatingToolbar.vue 的定位判断逻辑本身（measure()）。
import { afterEach, describe, expect, it, vi } from 'vitest'
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

function buildDefinition(): FormDefinition {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.id = 'age'
  field.key = 'age'
  field.name = 'age'
  field.label = '年龄'
  return {
    version: DSL_VERSION,
    id: 'toolbar-position-test',
    name: 'toolbar-position-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [field],
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

describe('I3：浮动工具条贴近画布顶部改贴元素内部', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('元素顶边空间不足（探测点没落在元素/列表内）：贴到元素内部右上角', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    const li = wrapper.find('[data-item-key="age"]').element as HTMLElement
    li.getBoundingClientRect = () =>
      ({ top: 100, left: 0, right: 300, bottom: 140, width: 300, height: 40 }) as DOMRect
    // 探测点落在别处（比如顶栏）：说明外侧位置被裁/被盖住
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(document.body)

    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await settle()

    const toolbar = wrapper.find('[data-testid="canvas-floating-toolbar"]')
    expect(toolbar.attributes('data-pinned-inside')).toBe('true')
    expect(toolbar.classes()).toContain('top-1')
    expect(toolbar.classes()).not.toContain('-top-[30px]')

    wrapper.unmount()
  })

  it('元素顶边空间充足（探测点落在元素自身内）：保持贴外侧', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition() },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      attachTo: document.body,
    })
    await settle()
    const state = getState(wrapper)
    state.selectedTarget.value = 'field'
    state.selectedKey.value = 'age'
    await settle()

    const li = wrapper.find('[data-item-key="age"]').element as HTMLElement
    li.getBoundingClientRect = () =>
      ({ top: 400, left: 0, right: 300, bottom: 440, width: 300, height: 40 }) as DOMRect
    // 探测点落在元素自己身上：外侧位置能正常显示
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(li)

    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await settle()

    const toolbar = wrapper.find('[data-testid="canvas-floating-toolbar"]')
    expect(toolbar.attributes('data-pinned-inside')).toBe('false')
    expect(toolbar.classes()).toContain('-top-[30px]')

    wrapper.unmount()
  })
})
