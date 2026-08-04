// ═══ 渲染层：元素 type → FormKit input 组件绑定 ═════════════════════════════════
// 与 DSL 注册表（dsl/registry.ts）分开：这里是唯一持有 .vue 组件引用的地方。
// formkitBindings：纯数据 type → { component, libraryName }，单一来源驱动两条链路：
//   buildFormkitInputs       → 每个元素统一注册为纯 $cmp 输入（createInput + library），
//   buildElementSchemaLibrary → FormKitSchema 的 $cmp → <FormKit> 包装组件（画布/预览渲染）。
// 每个绑定的 libraryName 必须与对应 DSL 模板的 target（$cmp 名）一致。

import type { Component } from 'vue'
import { defineComponent, h, markRaw } from 'vue'
import { createInput, FormKit } from '@formkit/vue'
import { getElementTypeDef, getElementTypeDefs, registerLegacyCmpAliases } from '../dsl/registry'
import { registerBuiltinElementTypes } from '../dsl/definitions'

import NaiveTextInput from '@/components/ui/fields/NaiveTextInput.vue'
import NaiveTextarea from '@/components/ui/fields/NaiveTextarea.vue'
import NaiveNumberInput from '@/components/ui/fields/NaiveNumberInput.vue'
import NaiveSelect from '@/components/ui/fields/NaiveSelect.vue'
import NaiveCheckboxGroup from '@/components/ui/fields/NaiveCheckboxGroup.vue'
import NaiveRadioGroup from '@/components/ui/fields/NaiveRadioGroup.vue'
import NaiveSlider from '@/components/ui/fields/NaiveSlider.vue'
import NaiveDatePicker from '@/components/ui/fields/NaiveDatePicker.vue'
import NaiveTimePicker from '@/components/ui/fields/NaiveTimePicker.vue'
import NaiveUpload from '@/components/ui/fields/NaiveUpload.vue'
import NaiveColorPicker from '@/components/ui/fields/NaiveColorPicker.vue'
import NaiveAvatar from '@/components/ui/fields/NaiveAvatar.vue'
import NaiveImage from '@/components/ui/fields/NaiveImage.vue'
import NaiveCascader from '@/components/ui/fields/NaiveCascader.vue'
import NaiveMention from '@/components/ui/fields/NaiveMention.vue'
import NaiveRate from '@/components/ui/fields/NaiveRate.vue'
import NaiveSwitch from '@/components/ui/fields/NaiveSwitch.vue'
import NaiveTreeSelect from '@/components/ui/fields/NaiveTreeSelect.vue'
import CustomButton from '@/components/ui/fields/CustomButton.vue'
import NaiveTypographyText from '@/components/ui/structure/NaiveTypographyText.vue'
import NaiveTypographyP from '@/components/ui/structure/NaiveTypographyP.vue'
import NaiveTypographyA from '@/components/ui/structure/NaiveTypographyA.vue'
import NaiveTypographyBlockquote from '@/components/ui/structure/NaiveTypographyBlockquote.vue'
import NaiveTypographyHeader from '@/components/ui/structure/NaiveTypographyHeader.vue'
import NaiveTypographyUl from '@/components/ui/structure/NaiveTypographyUl.vue'
import NaiveTypographyOl from '@/components/ui/structure/NaiveTypographyOl.vue'
import NaiveTypographyLi from '@/components/ui/structure/NaiveTypographyLi.vue'
import NaiveDivider from '@/components/ui/structure/NaiveDivider.vue'
import NaiveAlert from '@/components/ui/structure/NaiveAlert.vue'
import NaiveBackTop from '@/components/ui/structure/NaiveBackTop.vue'

registerBuiltinElementTypes()

export interface FormkitBinding {
  component: Component
  /** $cmp 名称（与 DSL 模板 target 一致；缺省 = type） */
  libraryName?: string
}

// 文本类字段共用同一底层组件，但 $cmp target 独立（NaiveEmailInput 等）保证往返可判别
export const formkitBindings: Record<string, FormkitBinding> = {
  // ─── 字段 ──────────────────────────────────────────────────────────────────────
  text: { component: NaiveTextInput, libraryName: 'NaiveTextInput' },
  textarea: { component: NaiveTextarea, libraryName: 'NaiveTextarea' },
  email: { component: NaiveTextInput, libraryName: 'NaiveEmailInput' },
  number: { component: NaiveNumberInput, libraryName: 'NaiveNumberInput' },
  url: { component: NaiveTextInput, libraryName: 'NaiveUrlInput' },
  checkbox: { component: NaiveCheckboxGroup, libraryName: 'NaiveCheckboxGroup' },
  color: { component: NaiveColorPicker, libraryName: 'NaiveColorPicker' },
  date: { component: NaiveDatePicker, libraryName: 'NaiveDatePicker' },
  time: { component: NaiveTimePicker, libraryName: 'NaiveTimePicker' },
  naiveDateTime: { component: NaiveDatePicker, libraryName: 'NaiveDateTimePicker' },
  file: { component: NaiveUpload, libraryName: 'NaiveUpload' },
  password: { component: NaiveTextInput, libraryName: 'NaivePasswordInput' },
  radio: { component: NaiveRadioGroup, libraryName: 'NaiveRadioGroup' },
  range: { component: NaiveSlider, libraryName: 'NaiveSlider' },
  select: { component: NaiveSelect, libraryName: 'NaiveSelect' },
  naiveCascader: { component: NaiveCascader, libraryName: 'NaiveCascader' },
  naiveTreeSelect: { component: NaiveTreeSelect, libraryName: 'NaiveTreeSelect' },
  naiveMention: { component: NaiveMention, libraryName: 'NaiveMention' },
  naiveRate: { component: NaiveRate, libraryName: 'NaiveRate' },
  naiveSwitch: { component: NaiveSwitch, libraryName: 'NaiveSwitch' },
  naiveAvatar: { component: NaiveAvatar, libraryName: 'NaiveAvatar' },
  naiveImage: { component: NaiveImage, libraryName: 'NaiveImage' },
  tel: { component: NaiveTextInput, libraryName: 'NaiveTelInput' },

  // ─── 静态展示 ──────────────────────────────────────────────────────────────────
  submit: { component: CustomButton, libraryName: 'CustomButton' },
  reset: { component: CustomButton, libraryName: 'CustomButton' },
  naiveButton: { component: CustomButton, libraryName: 'CustomButton' },
  naiveText: { component: NaiveTypographyText, libraryName: 'NaiveTypographyText' },
  naiveP: { component: NaiveTypographyP, libraryName: 'NaiveTypographyP' },
  naiveA: { component: NaiveTypographyA, libraryName: 'NaiveTypographyA' },
  naiveBlockquote: { component: NaiveTypographyBlockquote, libraryName: 'NaiveTypographyBlockquote' },
  naiveH1: { component: NaiveTypographyHeader, libraryName: 'NaiveTypographyHeader' },
  naiveH2: { component: NaiveTypographyHeader, libraryName: 'NaiveTypographyHeader' },
  naiveH3: { component: NaiveTypographyHeader, libraryName: 'NaiveTypographyHeader' },
  naiveH4: { component: NaiveTypographyHeader, libraryName: 'NaiveTypographyHeader' },
  naiveH5: { component: NaiveTypographyHeader, libraryName: 'NaiveTypographyHeader' },
  naiveH6: { component: NaiveTypographyHeader, libraryName: 'NaiveTypographyHeader' },
  naiveUl: { component: NaiveTypographyUl, libraryName: 'NaiveTypographyUl' },
  naiveOl: { component: NaiveTypographyOl, libraryName: 'NaiveTypographyOl' },
  naiveLi: { component: NaiveTypographyLi, libraryName: 'NaiveTypographyLi' },
  naiveDivider: { component: NaiveDivider, libraryName: 'NaiveDivider' },
  naiveAlert: { component: NaiveAlert, libraryName: 'NaiveAlert' },
  naiveBackTop: { component: NaiveBackTop, libraryName: 'NaiveBackTop' },
}

// legacy $cmp 别名单一来源：由 formkitBindings 派生注入 DSL 注册表（识别旧 Naive* 数据）
registerLegacyCmpAliases(
  Object.fromEntries(Object.entries(formkitBindings).map(([type, b]) => [b.libraryName ?? type, type])),
)

// ─── FormKit input 注册（画布/预览渲染）────────────────────────────────────────

// 用户扩展元素（registerElement）追加的绑定；buildFormkitInputs 合并内置 + 扩展。
const extraBindings = new Map<string, FormkitBinding>()

export function registerFormkitBinding(type: string, binding: FormkitBinding): void {
  extraBindings.set(type, binding)
  registerLegacyCmpAliases({ [binding.libraryName ?? type]: type })
}

export function getFormkitBinding(type: string): FormkitBinding | undefined {
  return formkitBindings[type] ?? extraBindings.get(type)
}

function allBindings(): Array<[string, FormkitBinding]> {
  const merged = { ...formkitBindings }
  for (const [type, binding] of extraBindings) merged[type] = binding
  return Object.entries(merged)
}

export function buildFormkitInputs(): Record<string, ReturnType<typeof createInput>> {
  const inputs: Record<string, ReturnType<typeof createInput>> = {}
  for (const [type, f] of allBindings()) {
    const libraryName = f.libraryName ?? type
    // 统一路径：每个输入（含按钮）的渲染 schema 都是纯 $cmp。
    // 不传 props 白名单 → 用户配置全量留在 node.props.attrs，由 bindings.observeProps 同步为
    // context.attrs（响应式，属性面板修改时触发组件重渲染）；context 由 FormKitSchema 显式注入
    // （FormKit 不会自动注入），组件用它做值绑定 + useSchemaAttrs 读取配置。
    inputs[type] = createInput(
      {
        $el: 'div',
        attrs: { class: 'w-full' },
        children: [{ $cmp: libraryName, props: { context: '$node.context' } }],
      },
      {
        family: 'naive',
        library: { [libraryName]: f.component },
        // 关键：声明空 features/props，覆盖 createLibraryPlugin 深合并时从内置
        // @formkit/inputs 继承的同名定义（radio/select/checkbox 等会继承 options/
        // radios/selects/casts 等 features 及 props）。否则 FormKit 会对 options 做
        // normalize（非字符串 value 会被替换成 __mask_N），并在 options 变空时于
        // normalizeOptions 里执行 Object.keys(undefined) 抛出 watcher 异常。
        features: [],
        props: [],
      },
    )
  }
  return inputs
}

// ─── $cmp schema 组件库（画布 / 预览 FormKitSchema 用）──────────────────────────
// 每个元素的 schema 以 $cmp: '<target>' 表达；这里把 target 映射到一层薄的 FormKit 包装组件，
// 内部按 createInput 注册的 input type 渲染，从而保留 context / label / 校验 / 值绑定。
function createElementCmpWrapper(type: string): Component {
  return markRaw(
    defineComponent({
      inheritAttrs: false,
      setup(_props, { attrs }) {
        return () => h(FormKit, { ...(attrs as Record<string, unknown>), type } as never)
      },
    }),
  ) as unknown as Component
}

/** 取元素 $cmp 渲染名（统一为 type；兼容旧 libraryName） */
export function getElementCmpName(type: string): string {
  const def = getElementTypeDef(type)
  if (def?.target) return def.target
  return getFormkitBinding(type)?.libraryName ?? type
}

export function buildElementSchemaLibrary(): Record<string, Component> {
  const lib: Record<string, Component> = {}
  for (const def of getElementTypeDefs()) {
    if (!getFormkitBinding(def.type)) continue
    lib[getElementCmpName(def.type)] = createElementCmpWrapper(def.type)
  }
  return lib
}
