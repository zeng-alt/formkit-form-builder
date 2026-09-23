// @vitest-environment happy-dom
// ═══ K2：图片元素自适应（sizeMode）═══════════════════════════════════════════════
// 画布与运行时共用 NaiveImage.vue，这里直接挂 FormRenderer 覆盖三种模式渲染出的样式：
// ratio → aspect-ratio；fill → 撑满所跨行高 + min-height 兜底；fixed → 按设定宽高
// 等比缩放、宽度不超过所在列。无 src 时应渲染占位框（不渲染 NImage）。
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

function buildDefinition(props: Record<string, unknown>): FormDefinition {
  const field = getElementTypeDef('naiveImage')!.defaults() as FieldNode
  field.name = 'img'
  field.label = 'Image'
  field.props = { ...field.props, ...props }
  return {
    version: DSL_VERSION,
    id: 'naive-image-size-mode-test',
    name: 'naive-image-size-mode-test',
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

describe('NaiveImage：sizeMode 渲染样式', () => {
  it('默认（未设置 sizeMode）：按比例 16:9，占位框（无 src）', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition({ src: '' }), modelValue: {} },
    })
    await settle()

    const el = wrapper.find('.naive-image-wrapper')
    expect(el.exists()).toBe(true)
    expect((el.element as HTMLElement).style.aspectRatio).toBe('16 / 9')
    expect((el.element as HTMLElement).style.width).toBe('100%')
    expect(wrapper.find('.naive-image-placeholder').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'NImage' }).exists()).toBe(false)

    wrapper.unmount()
  })

  it('ratio 模式：aspectRatio 切到 4/3', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildDefinition({ sizeMode: 'ratio', aspectRatio: '4/3', src: 'a.png' }),
        modelValue: {},
      },
    })
    await settle()

    const el = wrapper.find('.naive-image-wrapper')
    expect((el.element as HTMLElement).style.aspectRatio).toBe('4 / 3')
    expect((el.element as HTMLElement).style.width).toBe('100%')
    expect(wrapper.find('.naive-image-placeholder').exists()).toBe(false)
    expect(wrapper.find('.n-image').exists()).toBe(true)

    wrapper.unmount()
  })

  it('ratio 模式 + original：不设置 aspect-ratio', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildDefinition({ sizeMode: 'ratio', aspectRatio: 'original', src: 'a.png' }),
        modelValue: {},
      },
    })
    await settle()

    const el = wrapper.find('.naive-image-wrapper')
    expect((el.element as HTMLElement).style.aspectRatio).toBe('')
    expect((el.element as HTMLElement).style.width).toBe('100%')

    wrapper.unmount()
  })

  it('fill 模式：height:100% + minHeight 兜底（默认 120）', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildDefinition({ sizeMode: 'fill', src: 'a.png' }),
        modelValue: {},
      },
    })
    await settle()

    const el = wrapper.find('.naive-image-wrapper')
    expect((el.element as HTMLElement).style.width).toBe('100%')
    expect((el.element as HTMLElement).style.minHeight).toBe('120px')
    // 容器在 flex 列里撑满祖先传下来的高度（高度链由全局 .naive-image--fill 规则提供，
    // 画布与运行时共用）；图片绝对定位铺满容器，不参与行高计算
    expect(el.classes()).toContain('flex-1')
    expect(wrapper.find('.naive-image--fill').exists()).toBe(true)
    expect(wrapper.find('.naive-image-el--overlay').exists()).toBe(true)

    wrapper.unmount()
  })

  it('fill 模式：自定义 minHeight', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildDefinition({ sizeMode: 'fill', minHeight: 200, src: 'a.png' }),
        modelValue: {},
      },
    })
    await settle()

    const el = wrapper.find('.naive-image-wrapper')
    expect((el.element as HTMLElement).style.minHeight).toBe('200px')

    wrapper.unmount()
  })

  // 列比设定宽度窄时按设定宽高的比例整体缩小，而不是只压窄宽度把图片裁掉
  it('fixed 模式：按设定宽高等比缩放，宽度不超过所在列', async () => {
    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: {
        definition: buildDefinition({ sizeMode: 'fixed', width: 300, height: 200, src: 'a.png' }),
        modelValue: {},
      },
    })
    await settle()

    const el = wrapper.find('.naive-image-wrapper').element as HTMLElement
    expect(el.style.width).toBe('100%')
    expect(el.style.maxWidth).toBe('300px')
    expect(el.style.aspectRatio.replace(/\s/g, '')).toBe('300/200')
    const img = wrapper.find('.n-image img')
    expect(img.exists()).toBe(true)
    // 尺寸完全由容器决定，不再把像素宽高交给 <img>
    expect(img.attributes('width')).toBeUndefined()
    expect(img.attributes('height')).toBeUndefined()

    wrapper.unmount()
  })
})
