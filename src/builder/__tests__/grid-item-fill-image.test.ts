// @vitest-environment happy-dom
// ═══ K2：图片 fill 模式的高度撑满链路（回归守护）═══════════════════════════════════
// 真正的像素级拉伸只能在浏览器里验证（happy-dom 不跑布局引擎），这里锁住撑满链路
// 依赖的关键标记：li 打上 canvas-item--fill-image、内容包装层切到 flex 纵向布局并
// 撑满高度——这些类名一旦被误删，CanvasGridItem.vue 里对应的 :deep(.formkit-outer/
// wrapper/inner) 撑高规则就会连带失效，链路断在最外层却不会有任何类型或单测报错，
// 只会在浏览器里表现为图片高度塌陷回 minHeight。
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import BuilderMain from '@/builder/BuilderMain.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function buildDefinition(sizeMode: string): FormDefinition {
  const field = getElementTypeDef('naiveImage')!.defaults() as FieldNode
  field.id = 'img'
  field.key = 'img'
  field.name = 'img'
  field.props = { ...field.props, sizeMode, src: 'a.png' }
  return {
    version: DSL_VERSION,
    id: 'fill-image-test',
    name: 'fill-image-test',
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

describe('CanvasGridItem：fill 模式的高度撑满标记', () => {
  it('sizeMode=fill：li 打上 canvas-item--fill-image，内容包装层切到纵向 flex + h-full', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition('fill') },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()

    const li = wrapper.find('[data-item-key="img"]')
    expect(li.exists()).toBe(true)
    expect(li.classes()).toContain('canvas-item--fill-image')
    expect(li.find('.flex-col.h-full').exists()).toBe(true)

    wrapper.unmount()
  })

  it('sizeMode=ratio（默认）：不打这个标记，内容包装层保持原样', async () => {
    const wrapper = mount(BuilderMain, {
      props: { modelValue: buildDefinition('ratio') },
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
    })
    await settle()

    const li = wrapper.find('[data-item-key="img"]')
    expect(li.exists()).toBe(true)
    expect(li.classes()).not.toContain('canvas-item--fill-image')
    expect(li.find('.flex-col.h-full').exists()).toBe(false)

    wrapper.unmount()
  })
})
