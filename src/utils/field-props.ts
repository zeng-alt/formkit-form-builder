import type { Component } from 'vue'
import { defineAsyncComponent } from 'vue'

export type FieldCategory = 'fields' | 'structure' | 'static'

type FieldPropDef = {
  name: string
  tooltipKey: string
  icon: string
  category: FieldCategory
}

export type FieldProp = {
  name: string
  tooltip: string
  icon: string
  category: FieldCategory
}

const defs: FieldPropDef[] = [
  { name: 'text', tooltipKey: 'fieldProps.tooltip.text', icon: 'i-lucide-type', category: 'fields' },
  { name: 'textarea', tooltipKey: 'fieldProps.tooltip.textarea', icon: 'i-lucide-align-left', category: 'fields' },
  { name: 'email', tooltipKey: 'fieldProps.tooltip.email', icon: 'i-lucide-mail', category: 'fields' },
  { name: 'number', tooltipKey: 'fieldProps.tooltip.number', icon: 'i-lucide-hash', category: 'fields' },
  { name: 'url', tooltipKey: 'fieldProps.tooltip.url', icon: 'i-lucide-link', category: 'fields' },
  { name: 'tel', tooltipKey: 'fieldProps.tooltip.tel', icon: 'i-lucide-phone', category: 'fields' },
  { name: 'password', tooltipKey: 'fieldProps.tooltip.password', icon: 'i-lucide-lock', category: 'fields' },
  { name: 'select', tooltipKey: 'fieldProps.tooltip.select', icon: 'i-lucide-list', category: 'fields' },
  { name: 'checkbox', tooltipKey: 'fieldProps.tooltip.checkbox', icon: 'i-lucide-square-check', category: 'fields' },
  { name: 'radio', tooltipKey: 'fieldProps.tooltip.radio', icon: 'i-lucide-circle-dot', category: 'fields' },
  { name: 'range', tooltipKey: 'fieldProps.tooltip.range', icon: 'i-lucide-sliders-horizontal', category: 'fields' },
  { name: 'date', tooltipKey: 'fieldProps.tooltip.date', icon: 'i-lucide-calendar', category: 'fields' },
  { name: 'time', tooltipKey: 'fieldProps.tooltip.time', icon: 'i-lucide-clock', category: 'fields' },
  { name: 'naiveDateTime', tooltipKey: 'fieldProps.tooltip.dateTime', icon: 'i-lucide-calendar-clock', category: 'fields' },
  { name: 'file', tooltipKey: 'fieldProps.tooltip.file', icon: 'i-lucide-paperclip', category: 'fields' },
  { name: 'color', tooltipKey: 'fieldProps.tooltip.color', icon: 'i-lucide-pipette', category: 'fields' },
  { name: 'naiveCascader', tooltipKey: 'fieldProps.tooltip.naiveCascader', icon: 'i-lucide-list', category: 'fields' },
  { name: 'naiveTreeSelect', tooltipKey: 'fieldProps.tooltip.naiveTreeSelect', icon: 'i-lucide-list-tree', category: 'fields' },
  { name: 'naiveMention', tooltipKey: 'fieldProps.tooltip.naiveMention', icon: 'i-lucide-at-sign', category: 'fields' },
  { name: 'naiveRate', tooltipKey: 'fieldProps.tooltip.naiveRate', icon: 'i-lucide-star', category: 'fields' },
  { name: 'naiveSwitch', tooltipKey: 'fieldProps.tooltip.naiveSwitch', icon: 'i-lucide-toggle-left', category: 'fields' },

  { name: 'naiveAvatar', tooltipKey: 'fieldProps.tooltip.naiveAvatar', icon: 'i-lucide-user', category: 'static' },
  { name: 'naiveImage', tooltipKey: 'fieldProps.tooltip.naiveImage', icon: 'i-lucide-image', category: 'static' },
  { name: 'naiveText', tooltipKey: 'fieldProps.tooltip.naiveText', icon: 'i-lucide-text', category: 'static' },
  { name: 'naiveP', tooltipKey: 'fieldProps.tooltip.naiveP', icon: 'i-lucide-pilcrow', category: 'static' },
  { name: 'naiveA', tooltipKey: 'fieldProps.tooltip.naiveA', icon: 'i-lucide-link', category: 'static' },
  { name: 'naiveBlockquote', tooltipKey: 'fieldProps.tooltip.naiveBlockquote', icon: 'i-lucide-quote', category: 'static' },
  { name: 'naiveH1', tooltipKey: 'fieldProps.tooltip.naiveH1', icon: 'i-lucide-heading-1', category: 'static' },
  { name: 'naiveH2', tooltipKey: 'fieldProps.tooltip.naiveH2', icon: 'i-lucide-heading-2', category: 'static' },
  { name: 'naiveH3', tooltipKey: 'fieldProps.tooltip.naiveH3', icon: 'i-lucide-heading-3', category: 'static' },
  { name: 'naiveH4', tooltipKey: 'fieldProps.tooltip.naiveH4', icon: 'i-lucide-heading-4', category: 'static' },
  { name: 'naiveH5', tooltipKey: 'fieldProps.tooltip.naiveH5', icon: 'i-lucide-heading-5', category: 'static' },
  { name: 'naiveH6', tooltipKey: 'fieldProps.tooltip.naiveH6', icon: 'i-lucide-heading-6', category: 'static' },
  { name: 'naiveUl', tooltipKey: 'fieldProps.tooltip.naiveUl', icon: 'i-lucide-list', category: 'static' },
  { name: 'naiveOl', tooltipKey: 'fieldProps.tooltip.naiveOl', icon: 'i-lucide-list-ordered', category: 'static' },
  { name: 'naiveLi', tooltipKey: 'fieldProps.tooltip.naiveLi', icon: 'i-lucide-list', category: 'static' },
  { name: 'naiveDivider', tooltipKey: 'fieldProps.tooltip.naiveDivider', icon: 'i-lucide-separator-horizontal', category: 'static' },
  { name: 'naiveAlert', tooltipKey: 'fieldProps.tooltip.naiveAlert', icon: 'i-lucide-alert-triangle', category: 'static' },
  { name: 'naiveBackTop', tooltipKey: 'fieldProps.tooltip.naiveBackTop', icon: 'i-lucide-arrow-up-to-line', category: 'static' },
  { name: 'naiveButton', tooltipKey: 'fieldProps.tooltip.naiveButton', icon: 'i-lucide-square', category: 'static' },
  { name: 'submit', tooltipKey: 'fieldProps.tooltip.submit', icon: 'i-lucide-check-square', category: 'structure' },
  { name: 'reset', tooltipKey: 'fieldProps.tooltip.reset', icon: 'i-lucide-refresh-cw', category: 'structure' },
  { name: 'group', tooltipKey: 'fieldProps.tooltip.group', icon: 'i-lucide-layers', category: 'structure' },
  { name: 'list', tooltipKey: 'fieldProps.tooltip.list', icon: 'i-lucide-list', category: 'structure' },
  { name: 'card', tooltipKey: 'fieldProps.tooltip.card', icon: 'i-lucide-square-stack', category: 'structure' },
  { name: 'inputGroup', tooltipKey: 'fieldProps.tooltip.inputGroup', icon: 'i-lucide-columns-2', category: 'structure' },
  { name: 'tabs', tooltipKey: 'fieldProps.tooltip.tabs', icon: 'i-lucide-panels-top-left', category: 'structure' },
]

export function createFieldProps(
  t: (key: string, params?: Record<string, string | number>) => string,
): FieldProp[] {
  return defs.map((def) => ({
    name: def.name,
    tooltip: t(def.tooltipKey),
    icon: def.icon,
    category: def.category,
  }))
}

const editorImports: Record<string, () => Promise<{ default: Component }>> = {
  text: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  textarea: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  email: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  url: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  tel: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  password: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  number: () => import('@/components/sidebar-right/edits/editors/NumberEditor.vue'),
  checkbox: () => import('@/components/sidebar-right/edits/editors/CheckboxEditor.vue'),
  radio: () => import('@/components/sidebar-right/edits/editors/RadioEditor.vue'),
  range: () => import('@/components/sidebar-right/edits/editors/RangeEditor.vue'),
  select: () => import('@/components/sidebar-right/edits/editors/SelectEditor.vue'),
  date: () => import('@/components/sidebar-right/edits/editors/DateLikeEditor.vue'),
  time: () => import('@/components/sidebar-right/edits/editors/DateLikeEditor.vue'),
  naiveDateTime: () => import('@/components/sidebar-right/edits/editors/DateTimeEditor.vue'),
  file: () => import('@/components/sidebar-right/edits/editors/FileEditor.vue'),
  color: () => import('@/components/sidebar-right/edits/editors/ColorEditor.vue'),
  naiveCascader: () => import('@/components/sidebar-right/edits/editors/NaiveCascaderEditor.vue'),
  naiveTreeSelect: () => import('@/components/sidebar-right/edits/editors/NaiveTreeSelectEditor.vue'),
  naiveMention: () => import('@/components/sidebar-right/edits/editors/NaiveMentionEditor.vue'),
  naiveRate: () => import('@/components/sidebar-right/edits/editors/NaiveRateEditor.vue'),
  naiveSwitch: () => import('@/components/sidebar-right/edits/editors/NaiveSwitchEditor.vue'),

  naiveAvatar: () => import('@/components/sidebar-right/edits/editors/NaiveAvatarEditor.vue'),
  naiveImage: () => import('@/components/sidebar-right/edits/editors/NaiveImageEditor.vue'),
  naiveText: () => import('@/components/sidebar-right/edits/editors/NaiveTextEditor.vue'),
  naiveP: () => import('@/components/sidebar-right/edits/editors/NaiveParagraphEditor.vue'),
  naiveA: () => import('@/components/sidebar-right/edits/editors/NaiveLinkEditor.vue'),
  naiveBlockquote: () => import('@/components/sidebar-right/edits/editors/NaiveBlockquoteEditor.vue'),
  naiveH1: () => import('@/components/sidebar-right/edits/editors/NaiveH1Editor.vue'),
  naiveH2: () => import('@/components/sidebar-right/edits/editors/NaiveH2Editor.vue'),
  naiveH3: () => import('@/components/sidebar-right/edits/editors/NaiveH3Editor.vue'),
  naiveH4: () => import('@/components/sidebar-right/edits/editors/NaiveH4Editor.vue'),
  naiveH5: () => import('@/components/sidebar-right/edits/editors/NaiveH5Editor.vue'),
  naiveH6: () => import('@/components/sidebar-right/edits/editors/NaiveH6Editor.vue'),
  naiveUl: () => import('@/components/sidebar-right/edits/editors/NaiveUlEditor.vue'),
  naiveOl: () => import('@/components/sidebar-right/edits/editors/NaiveOlEditor.vue'),
  naiveLi: () => import('@/components/sidebar-right/edits/editors/NaiveLiEditor.vue'),
  naiveDivider: () => import('@/components/sidebar-right/edits/editors/NaiveDividerEditor.vue'),
  naiveAlert: () => import('@/components/sidebar-right/edits/editors/NaiveAlertEditor.vue'),
  naiveBackTop: () => import('@/components/sidebar-right/edits/editors/NaiveBackTopEditor.vue'),
  naiveButton: () => import('@/components/sidebar-right/edits/editors/NaiveButtonEditor.vue'),

  submit: () => import('@/components/sidebar-right/edits/editors/SubmitEditor.vue'),
  reset: () => import('@/components/sidebar-right/edits/editors/SubmitEditor.vue'),

  group: () => import('@/components/sidebar-right/edits/editors/GroupEditor.vue'),
  card: () => import('@/components/sidebar-right/edits/editors/CardEditor.vue'),
  inputGroup: () => import('@/components/sidebar-right/edits/editors/InputGroupEditor.vue'),
  tabs: () => import('@/components/sidebar-right/edits/editors/TabsEditor.vue'),
}

const editorComponents: Record<string, Component> = {}

export function getFieldEditorComponent(type: string | null) {
  const key = type ?? ''
  if (!key) return null
  const loader = editorImports[key]
  if (!loader) return null
  if (editorComponents[key]) return editorComponents[key]!
  const cmp = defineAsyncComponent(loader)
  editorComponents[key] = cmp
  return cmp
}
