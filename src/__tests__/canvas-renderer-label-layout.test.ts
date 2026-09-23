// @vitest-environment happy-dom
// ═══ 真实渲染集成测试：画布与运行时共享同一套表单级标签布局 ═══════════════════════
// 背景：标签位置/宽度的样式类此前在 use-canvas-schema.ts 的 canvasFormClass 与
// FormRenderer.vue 的 resolvedFormClass 各写一份，已经出现漂移（运行时多一个
// fk-label-left 标记类，画布没有）。现在两边都改用 src/utils/form-layout.ts 的
// formLabelLayoutClass / formLabelWidthStyle，不再各自拼一份。
// 这里用同一份表单定义（labelAlign 分别 top/left，labelWidth=140）分别挂载设计器
// 画布（BuilderMain）与 FormRenderer，断言两边表单根元素上「标签布局相关」的类
// 集合一致，且 --fk-label-width 都解析成 140px。
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { BUILDER_STATE_KEY, type FormBuilderState } from '@/state/create-form-builder-state'
import { DSL_VERSION } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'
import { formLabelLayoutClass } from '@/utils/form-layout'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function buildDefinition(labelAlign: 'top' | 'left', labelWidth: number): FormDefinition {
  const field: FieldNode = {
    id: 'f1',
    key: 'f1',
    category: 'field',
    type: 'text',
    renderAs: 'formkit',
    name: 'f1',
    label: 'Field 1',
  }
  return {
    version: DSL_VERSION,
    id: 'layout-form',
    name: 'layout-form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [field],
    },
    settings: { labelAlign, labelWidth },
  }
}

// 表单根元素的定位方式：画布是 CanvasBoard 的 n-card，运行时是 FormRenderer 内部
// FormKit 渲染出的 form 元素——两边 DOM 结构完全不同，不依赖各自的结构细节，
// 改用"谁携带 --fk-label-width 这个内联样式变量"来定位（两边都无条件设置它）。
function findLabelWidthCarrier(root: Element): HTMLElement | null {
  const all = [root, ...Array.from(root.querySelectorAll('*'))]
  for (const el of all) {
    if (!(el instanceof HTMLElement)) continue
    if (el.style.getPropertyValue('--fk-label-width')) return el
  }
  return null
}

async function mountCanvas(def: FormDefinition) {
  const wrapper = mount(BuilderMain, {
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    props: { config: {} },
  })
  await settle()
  const provides = (wrapper.vm.$ as unknown as { provides: Record<string, unknown> }).provides
  const state = provides[BUILDER_STATE_KEY as unknown as string] as FormBuilderState
  expect(state).toBeTruthy()
  state.setFormDefinition(def, { resetHistory: true })
  await settle()
  return wrapper
}

async function mountRenderer(def: FormDefinition) {
  const wrapper = mount(FormRenderer, {
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    props: { definition: def, modelValue: {} },
  })
  await settle()
  return wrapper
}

describe('画布与运行时共享同一套表单级标签布局', () => {
  it.each([['top', 140] as const, ['left', 140] as const])(
    'labelAlign=%s labelWidth=%i：画布与 FormRenderer 的标签布局类集合一致，--fk-label-width 都是 140px',
    async (labelAlign, labelWidth) => {
      const def = buildDefinition(labelAlign, labelWidth)
      const layoutClasses = new Set(formLabelLayoutClass(labelAlign).split(' '))

      const canvasWrapper = await mountCanvas(def)
      const rendererWrapper = await mountRenderer(def)

      const canvasCarrier = findLabelWidthCarrier(canvasWrapper.element)
      const rendererCarrier = findLabelWidthCarrier(rendererWrapper.element)
      expect(canvasCarrier, '画布没有找到携带 --fk-label-width 的元素').toBeTruthy()
      expect(rendererCarrier, 'FormRenderer 没有找到携带 --fk-label-width 的元素').toBeTruthy()

      expect(canvasCarrier!.style.getPropertyValue('--fk-label-width')).toBe('140px')
      expect(rendererCarrier!.style.getPropertyValue('--fk-label-width')).toBe('140px')

      // 两边根元素的完整 class 列表天然不同（画布是 n-card + cn() 拼的一堆布局类，
      // 运行时是 FormKit 渲染出的 form 元素），只比较「属于标签布局类」的子集
      const canvasLayoutClasses = new Set(
        [...canvasCarrier!.classList].filter((c) => layoutClasses.has(c)),
      )
      const rendererLayoutClasses = new Set(
        [...rendererCarrier!.classList].filter((c) => layoutClasses.has(c)),
      )

      expect(canvasLayoutClasses).toEqual(layoutClasses)
      expect(rendererLayoutClasses).toEqual(layoutClasses)

      canvasWrapper.unmount()
      rendererWrapper.unmount()
    },
  )
})
