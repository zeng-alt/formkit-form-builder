// @vitest-environment happy-dom
// ═══ 真实渲染集成测试：整表单禁用（disabled）必须对每种可交互字段都生效 ═══════════
// 背景：disabled 是 FormKit 保留的级联属性名，会被 @formkit/vue useInput.ts 的
// pseudoProps 表拦截，不会流入 useSchemaAttrs 镜像出的 props 透传包，必须由每个字段
// 包装组件显式转发（见 src/components/ui/formkit/use-schema-attrs.ts 的 disabled
// 计算属性）。上一轮只修了 NaiveTextInput/NaiveRate，这一轮补齐另外 16 个组件——本文件
// 是防它们再次腐化的行为层回归（配合 src/components/sidebar-right/__tests__/editor-keys.test.ts
// 的静态审计一起兜底：那份测试保证"编辑器写的键有人读"，这份测试保证"读了之后真的转发
// 到了 naive-ui、渲染结果里能看见"）。
//
// 不硬编码每个 naive-ui 组件的禁用 class 名（它们互不相同，未来也可能随 naive-ui
// 升级改名）：改用"基准"方式自动推导——同一个组件分别以 disabled:true / disabled:false
// 裸挂载一次，对渲染出的整棵子树（含所有后代元素）收集 class，取两次的差集，差集里
// 独有的类名就是该组件的禁用标记。评分（naiveRate）没有 disabled prop，只有 readonly，
// 按 readonly:true / readonly:false 单独推导（见 RATE_BASELINE）。
import { describe, it, expect } from 'vitest'
import { h, nextTick, type Component } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import {
  NAutoComplete,
  NCascader,
  NCheckbox,
  NCheckboxGroup,
  NColorPicker,
  NDatePicker,
  NInput,
  NInputNumber,
  NMention,
  NRadio,
  NRadioGroup,
  NRate,
  NSelect,
  NSlider,
  NSwitch,
  NTimePicker,
  NTransfer,
  NTreeSelect,
  NUpload,
  NUploadDragger,
} from 'naive-ui'
import formkitDefaultConfig from '@/formkit.config'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 5; i++) await nextTick()
}

// ─── 基准：裸挂载 naive-ui 组件，diff 出禁用/只读标记 class ────────────────────────
// 每一项尽量复现该类型在真实字段组件里的子结构（比如 checkbox/radio 组要带至少一个
// 选项子组件、file 要带 dragger 子插槽），否则禁用态没有落点、diff 会是空集——这不是
// "推导失败"，是基准本身没搭对，所以这里如实还原真实用法，而不是随便糊一个空壳。
type Probe = {
  component: Component
  propKey: 'disabled' | 'readonly'
  props?: Record<string, unknown>
  slots?: Record<string, unknown>
}

const PROBES: Record<string, Probe> = {
  naiveAutoComplete: { component: NAutoComplete, propKey: 'disabled' },
  naiveCascader: { component: NCascader, propKey: 'disabled' },
  checkbox: {
    component: NCheckboxGroup,
    propKey: 'disabled',
    slots: { default: () => h(NCheckbox, { value: 'a' }, () => 'a') },
  },
  color: { component: NColorPicker, propKey: 'disabled' },
  date: { component: NDatePicker, propKey: 'disabled' },
  naiveMention: { component: NMention, propKey: 'disabled' },
  number: { component: NInputNumber, propKey: 'disabled' },
  radio: {
    component: NRadioGroup,
    propKey: 'disabled',
    slots: { default: () => h(NRadio, { value: 'a' }, () => 'a') },
  },
  select: { component: NSelect, propKey: 'disabled' },
  range: { component: NSlider, propKey: 'disabled' },
  naiveSwitch: { component: NSwitch, propKey: 'disabled' },
  textarea: { component: NInput, propKey: 'disabled', props: { type: 'textarea' } },
  time: { component: NTimePicker, propKey: 'disabled' },
  naiveTransfer: { component: NTransfer, propKey: 'disabled' },
  naiveTreeSelect: { component: NTreeSelect, propKey: 'disabled' },
  // file 带上与 NaiveUpload.vue 真实渲染一致的拖拽区子组件
  file: {
    component: NUpload,
    propKey: 'disabled',
    slots: { default: () => h(NUploadDragger, null, () => 'x') },
  },
}

// 评分：NRate 没有 disabled prop，禁用语义映射到 readonly（见 NaiveRate.vue）
const RATE_PROBE: Probe = { component: NRate, propKey: 'readonly' }

function collectClasses(root: Element): Set<string> {
  const set = new Set<string>()
  root.classList.forEach((c) => set.add(c))
  root.querySelectorAll('*').forEach((el) => {
    el.classList.forEach((c) => set.add(c))
  })
  return set
}

// 推导某个 probe 的禁用/只读标记 class 集合。空集合直接抛错（让调用它的用例失败并
// 说明原因），不是静默跳过——按任务要求，推导不出差集就是测试本身要报的问题。
function deriveMarkerClasses(name: string, probe: Probe): Set<string> {
  const onWrapper = mount(probe.component, {
    props: { ...probe.props, [probe.propKey]: true },
    slots: probe.slots,
  })
  const offWrapper = mount(probe.component, {
    props: { ...probe.props, [probe.propKey]: false },
    slots: probe.slots,
  })
  const onSet = collectClasses(onWrapper.element)
  const offSet = collectClasses(offWrapper.element)
  const diff = new Set([...onSet].filter((c) => !offSet.has(c)))
  onWrapper.unmount()
  offWrapper.unmount()
  if (diff.size === 0) {
    throw new Error(
      `「${name}」基准推导失败：${probe.propKey}:true / false 两次裸挂载渲染出的 class 完全一样，` +
        `推不出禁用标记 class（基准 probe 没有搭对结构，还是这个 naive-ui 组件确实不区分 ${probe.propKey} 态？需要人工确认）`,
    )
  }
  return diff
}

function buildDefinition(type: string): FormDefinition {
  const field = getElementTypeDef(type)!.defaults() as FieldNode
  field.name = 'f'
  field.label = 'F'
  return {
    version: DSL_VERSION,
    id: `form-disabled-${type}`,
    name: `form-disabled-${type}`,
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

describe('FormRenderer 真实渲染：整表单 disabled 对每种可交互字段都生效', () => {
  const types = Object.keys(PROBES).sort()

  it.each(types)('%s：整表单 disabled=true 时字段应带上对应的禁用标记 class', async (type) => {
    const probe = PROBES[type]!
    const markers = deriveMarkerClasses(type, probe)

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition(type), modelValue: {}, disabled: true },
    })
    await settle()

    const rendered = collectClasses(wrapper.element)
    const missing = [...markers].filter((c) => !rendered.has(c))
    expect(
      missing,
      `「${type}」整表单禁用后，渲染结果里没有出现禁用标记 class ${[...markers].join('/')}` +
        `（缺失：${missing.join('/')}）——字段包装组件大概率没有把 disabled 转发给底层 naive-ui 组件`,
    ).toEqual([])

    wrapper.unmount()
  })

  // 评分：禁用语义映射到 readonly，单独处理——FormRenderer 层面仍然是整表单
  // disabled:true（用户操作的是同一个开关），只是 NaiveRate.vue 内部把它映射成了
  // NRate 的 readonly prop（见该文件注释），所以这里的基准用 readonly 推导，
  // 但触发渲染的仍是 disabled:true
  it('naiveRate：整表单 disabled=true 时评分应带上 readonly 标记 class', async () => {
    const markers = deriveMarkerClasses('naiveRate', RATE_PROBE)

    const wrapper = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: buildDefinition('naiveRate'), modelValue: {}, disabled: true },
    })
    await settle()

    const rendered = collectClasses(wrapper.element)
    const missing = [...markers].filter((c) => !rendered.has(c))
    expect(missing, `评分整表单禁用后缺失只读标记 class：${missing.join('/')}`).toEqual([])

    wrapper.unmount()
  })
})
