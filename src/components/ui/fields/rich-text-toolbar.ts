// richText 工具栏项的单一来源：字段默认值（elements/definitions/fields.ts）、
// 画布组件（RichText.vue）与属性编辑器（RichTextEditor.vue）三处共用同一份 key 列表，
// 避免三处各写一份、顺序或拼写不一致。纯数据，不含任何渲染逻辑。

export const RICH_TEXT_TOOLBAR_ITEMS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'link',
  'clear',
  'undo',
  'redo',
] as const

export type RichTextToolbarItem = (typeof RICH_TEXT_TOOLBAR_ITEMS)[number]

/** 每项工具栏开关的图标 + i18n key 后缀（edits.richText.toolbar.<key>） */
export const RICH_TEXT_TOOLBAR_META: Record<RichTextToolbarItem, { icon: string }> = {
  bold: { icon: 'i-lucide-bold' },
  italic: { icon: 'i-lucide-italic' },
  underline: { icon: 'i-lucide-underline' },
  strike: { icon: 'i-lucide-strikethrough' },
  heading: { icon: 'i-lucide-heading-2' },
  bulletList: { icon: 'i-lucide-list' },
  orderedList: { icon: 'i-lucide-list-ordered' },
  blockquote: { icon: 'i-lucide-quote' },
  link: { icon: 'i-lucide-link-2' },
  clear: { icon: 'i-lucide-eraser' },
  undo: { icon: 'i-lucide-undo-2' },
  redo: { icon: 'i-lucide-redo-2' },
}
