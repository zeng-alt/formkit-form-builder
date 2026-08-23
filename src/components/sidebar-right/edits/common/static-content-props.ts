// 静态元素统一"内容"编辑区块的数据驱动映射：元素类型 → 需要编辑的内容字段。
// 内容存储在各元素自己的 props 上（text / title / content / value），
// 由 StaticContentSection 用 createPropsProp 读写；对应编辑器不再重复渲染内容输入。

export interface StaticContentField {
  /** 写入 node.props 的 key */
  key: string
  /** 输入框 label 的 i18n key */
  labelKey: string
  /** 多行文本（textarea） */
  multiline?: boolean
}

const CONTENT_FIELDS: Record<string, StaticContentField[]> = {
  naiveH1: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveH2: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveH3: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveH4: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveH5: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveH6: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveText: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveP: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveA: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveBlockquote: [{ key: 'text', labelKey: 'edits.content.text', multiline: true }],
  naiveLi: [{ key: 'value', labelKey: 'edits.content.text', multiline: true }],
  naiveDivider: [{ key: 'title', labelKey: 'edits.content.title' }],
  naiveAlert: [
    { key: 'title', labelKey: 'edits.content.title' },
    { key: 'content', labelKey: 'edits.content.content', multiline: true },
  ],
  naiveQrCode: [{ key: 'value', labelKey: 'edits.content.text' }],
}

export function getStaticContentFields(type: string | null | undefined): StaticContentField[] {
  if (!type) return []
  return CONTENT_FIELDS[type] ?? []
}
