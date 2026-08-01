// ═══ 内置 DSL 元素类型注册 ════════════════════════════════════════════════════
// 新元素类型 = 在这里（或调用方）registerElementType 一条定义。
// P2 会把这套注册表与 src/elements/ 左侧面板物料合并为唯一来源。

import {
  registerElementType,
  fieldType,
  containerType,
  layoutType,
  staticType,
  tabsPaneType,
} from './registry'

let builtinRegistered = false

// ─── 字段 ──────────────────────────────────────────────────────────────────────
// 与 src/elements/definitions/fields.ts 的 ElementDefinition.type 对齐；
// cmp 为 schema 输出的 $cmp 组件名（渲染时经 elements 的 schema library → FormKit input）

export const FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'number',
  'url',
  'checkbox',
  'color',
  'date',
  'time',
  'naiveDateTime',
  'datetime',
  'file',
  'password',
  'radio',
  'range',
  'select',
  'naiveCascader',
  'naiveTreeSelect',
  'naiveMention',
  'naiveRate',
  'naiveSwitch',
  'naiveAvatar',
  'naiveImage',
  'tel',
]

/** 字段 type → $cmp 组件名（与 src/elements/definitions/fields.ts 的 $cmp 对齐；
 *  共享底层组件的类型用独立 $cmp key（NaiveEmailInput 等）保证往返可判别） */
export const FIELD_CMP: Record<string, string> = {
  text: 'NaiveTextInput',
  textarea: 'NaiveTextarea',
  email: 'NaiveEmailInput',
  number: 'NaiveNumberInput',
  url: 'NaiveUrlInput',
  checkbox: 'NaiveCheckboxGroup',
  color: 'NaiveColorPicker',
  date: 'NaiveDatePicker',
  time: 'NaiveTimePicker',
  naiveDateTime: 'NaiveDateTimePicker',
  file: 'NaiveUpload',
  password: 'NaivePasswordInput',
  radio: 'NaiveRadioGroup',
  range: 'NaiveSlider',
  select: 'NaiveSelect',
  naiveCascader: 'NaiveCascader',
  naiveTreeSelect: 'NaiveTreeSelect',
  naiveMention: 'NaiveMention',
  naiveRate: 'NaiveRate',
  naiveSwitch: 'NaiveSwitch',
  naiveAvatar: 'NaiveAvatar',
  naiveImage: 'NaiveImage',
  tel: 'NaiveTelInput',
}

export function registerBuiltinElementTypes(): void {
  if (builtinRegistered) return
  builtinRegistered = true

  for (const type of FIELD_TYPES) {
    registerElementType(fieldType(type, FIELD_CMP[type] ? { cmp: FIELD_CMP[type] } : undefined))
  }

  // ─── 容器（数据结构）─────────────────────────────────────────────────────────
  registerElementType(containerType('group', { dataType: 'object' }))
  registerElementType(containerType('list', { dataType: 'array' }))
  registerElementType(containerType('inputGroup', { dataType: 'array' }))

  // ─── 布局 ────────────────────────────────────────────────────────────────────
  registerElementType(layoutType('card'))
  registerElementType(layoutType('tabs'))
  registerElementType(layoutType('grid'))
  registerElementType(layoutType('row'))
  registerElementType(layoutType('column'))
  registerElementType(tabsPaneType())

  // ─── 静态展示 ────────────────────────────────────────────────────────────────
  registerElementType(staticType('submit', { cmp: 'NaiveSubmit' }))
  registerElementType(staticType('reset', { cmp: 'NaiveReset' }))
  registerElementType(staticType('button', { match: (s) => (s as any).$el === 'button' }))
  registerElementType(staticType('paragraph', { match: (s) => (s as any).$el === 'p' }))
  registerElementType(
    staticType('heading', { match: (s) => /^h[1-6]$/.test(String((s as any).$el)) }),
  )
  registerElementType(staticType('divider', { match: (s) => (s as any).$el === 'hr' }))

  // $cmp 型静态（对应 src/elements/definitions/static.ts 的 naive* 组件）
  // 共享同一组件的类型用独立 $cmp key（NaiveSubmit/NaiveReset/NaiveButton/NaiveH1~H6）保证往返可判别
  const naiveStatics: { type: string; cmp: string }[] = [
    { type: 'naiveButton', cmp: 'NaiveButton' },
    { type: 'naiveText', cmp: 'NaiveTypographyText' },
    { type: 'naiveP', cmp: 'NaiveTypographyP' },
    { type: 'naiveA', cmp: 'NaiveTypographyA' },
    { type: 'naiveBlockquote', cmp: 'NaiveTypographyBlockquote' },
    { type: 'naiveH1', cmp: 'NaiveH1' },
    { type: 'naiveH2', cmp: 'NaiveH2' },
    { type: 'naiveH3', cmp: 'NaiveH3' },
    { type: 'naiveH4', cmp: 'NaiveH4' },
    { type: 'naiveH5', cmp: 'NaiveH5' },
    { type: 'naiveH6', cmp: 'NaiveH6' },
    { type: 'naiveUl', cmp: 'NaiveTypographyUl' },
    { type: 'naiveOl', cmp: 'NaiveTypographyOl' },
    { type: 'naiveLi', cmp: 'NaiveTypographyLi' },
    { type: 'naiveDivider', cmp: 'NaiveDivider' },
    { type: 'naiveAlert', cmp: 'NaiveAlert' },
    { type: 'naiveBackTop', cmp: 'NaiveBackTop' },
  ]
  for (const { type, cmp } of naiveStatics) {
    registerElementType(staticType(type, { cmp }))
  }
}
