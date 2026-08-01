// ═══ 渲染层：元素 type → FormKit input 组件绑定 ═════════════════════════════════
// 与 DSL 注册表（dsl/registry.ts）分开：这里是唯一持有 .vue 组件引用的地方。
// buildFormkitInputs：FormKit 配置注册（src/formkit.config.ts）
// buildElementSchemaLibrary：FormKitSchema 的 $cmp → 薄包装组件（画布/预览渲染）
// 每个绑定的 libraryName 必须与对应 DSL 模板的 target（$cmp 名）一致。

import type { Component } from 'vue'
import { defineComponent, h, markRaw } from 'vue'
import { createInput, FormKit } from '@formkit/vue'
import { getElementTypeDef, getElementTypeDefs } from '../dsl/registry'
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
  /** false 表示直接 createInput(component)；默认 true（createUiInput 包装） */
  wrap?: boolean
  /** wrap=true 时 $cmp 名称（需与 DSL 模板 target 一致） */
  libraryName?: string
  family?: string
  props?: string[]
}

export const SHARED_FORMKIT_PROPS = [
  'props',
  '__bind',
  'placeholder',
  'options',
  'min',
  'max',
  'step',
  'multiple',
  'accept',
]

// 按钮类静态元素：CustomButton 直读展平后的 props（原 buttonProps 嵌套已废除）
export const BUTTON_PROPS = [
  'label',
  'type',
  '__bind',
  'buttonText',
  'text',
  'block',
  'bordered',
  'circle',
  'dashed',
  'disabled',
  'focusable',
  'fullWidth',
  'align',
  'ghost',
  'round',
  'secondary',
  'size',
]

// 文本类字段共用同一底层组件，但 $cmp target 独立（NaiveEmailInput 等）保证往返可判别
const textLike = { component: NaiveTextInput } as const

export const formkitBindings: Record<string, FormkitBinding> = {
  // ─── 字段 ──────────────────────────────────────────────────────────────────────
  text: { ...textLike, libraryName: 'NaiveTextInput' },
  textarea: { component: NaiveTextarea, libraryName: 'NaiveTextarea' },
  email: { ...textLike, libraryName: 'NaiveEmailInput' },
  number: { component: NaiveNumberInput, libraryName: 'NaiveNumberInput' },
  url: { ...textLike, libraryName: 'NaiveUrlInput' },
  checkbox: { component: NaiveCheckboxGroup, libraryName: 'NaiveCheckboxGroup' },
  color: { component: NaiveColorPicker, libraryName: 'NaiveColorPicker' },
  date: { component: NaiveDatePicker, libraryName: 'NaiveDatePicker' },
  time: { component: NaiveTimePicker, libraryName: 'NaiveTimePicker' },
  naiveDateTime: { component: NaiveDatePicker, libraryName: 'NaiveDateTimePicker' },
  file: { component: NaiveUpload, libraryName: 'NaiveUpload' },
  password: { ...textLike, libraryName: 'NaivePasswordInput' },
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
  tel: { ...textLike, libraryName: 'NaiveTelInput' },

  // ─── 静态展示 ──────────────────────────────────────────────────────────────────
  submit: { component: CustomButton, wrap: false, props: BUTTON_PROPS },
  reset: { component: CustomButton, wrap: false, props: BUTTON_PROPS },
  naiveButton: { component: CustomButton, wrap: false, props: BUTTON_PROPS },
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

// ─── FormKit input 注册（画布/预览渲染）────────────────────────────────────────

// 用户扩展元素（registerElement）追加的绑定；buildFormkitInputs 合并内置 + 扩展。
const extraBindings = new Map<string, FormkitBinding>()

export function registerFormkitBinding(type: string, binding: FormkitBinding): void {
  extraBindings.set(type, binding)
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
    const family = f.family ?? 'naive'
    const props = f.props ?? SHARED_FORMKIT_PROPS

    if (f.wrap === false) {
      inputs[type] = createInput(f.component, { family, props })
      continue
    }

    const libraryName = f.libraryName ?? type
    inputs[type] = createInput(
      {
        $el: 'div',
        attrs: { class: 'w-full' },
        children: [
          {
            $cmp: libraryName,
            props: { context: '$node.context' },
          },
        ],
      },
      {
        family,
        props,
        library: { [libraryName]: f.component },
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
