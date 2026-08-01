// ═══ 内置 DSL 元素类型注册 ════════════════════════════════════════════════════
// 新元素类型 = 在这里（或调用方）registerElementType 一条定义。
// P2 会把这套注册表与 src/elements/ 左侧面板物料合并为唯一来源。

import { registerElementType, fieldType, containerType, layoutType, staticType, tabsPaneType } from './registry'

let builtinRegistered = false

// ─── 字段 ──────────────────────────────────────────────────────────────────────
// 与 src/elements/definitions/fields.ts 的 ElementDefinition.type 对齐

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

export function registerBuiltinElementTypes(): void {
  if (builtinRegistered) return
  builtinRegistered = true

  for (const type of FIELD_TYPES) {
    registerElementType(fieldType(type))
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
  registerElementType(staticType('submit', { match: (s) => (s as any).$formkit === 'submit' }))
  registerElementType(staticType('reset', { match: (s) => (s as any).$formkit === 'reset' }))
  registerElementType(staticType('button', { match: (s) => (s as any).$el === 'button' }))
  registerElementType(staticType('paragraph', { match: (s) => (s as any).$el === 'p' }))
  registerElementType(staticType('heading', { match: (s) => /^h[1-6]$/.test(String((s as any).$el)) }))
  registerElementType(staticType('divider', { match: (s) => (s as any).$el === 'hr' }))

  // $formkit 型静态（对应 src/elements/definitions/static.ts 的 naive* 组件）
  const naiveStatics = [
    'naiveButton',
    'naiveText',
    'naiveP',
    'naiveA',
    'naiveBlockquote',
    'naiveH1',
    'naiveH2',
    'naiveH3',
    'naiveH4',
    'naiveH5',
    'naiveH6',
    'naiveUl',
    'naiveOl',
    'naiveLi',
    'naiveDivider',
    'naiveAlert',
    'naiveBackTop',
  ] as const
  for (const type of naiveStatics) {
    registerElementType(staticType(type, { match: (s) => (s as any).$formkit === type }))
  }
}
