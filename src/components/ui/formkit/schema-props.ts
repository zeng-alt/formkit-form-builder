import type { FormKitFrameworkContext } from '@formkit/core'

// FormKit 运行时会把 $cmp / $formkit 节点的 props 摊平进 node.props 顶层
// （FormKitSchema parseAttrs → createElementCmpWrapper → <FormKit> → useInput），
// 并不存在嵌套的 props 包。这里从摊平后的 bag 重建"用户 authored props"，
// 剔除 FormKit 内部 / 结构键，避免把输入类型等泄漏给组件。
const INTERNAL_KEYS = new Set([
  'config',
  'plugins',
  'modelValue',
  'value',
  'name',
  'id',
  'label',
  '__root',
  '__slots',
  '__key',
  'attrs',
  'key',
  'index',
  '_value',
  'if',
  'children',
  'outerClass',
  'validation',
  'validationMessages',
  'validationVisibility',
  '__bind',
  'type',
])

export function getSchemaProps(ctx: FormKitFrameworkContext): Record<string, unknown> {
  const nodeProps = (ctx as any)?.node?.props ?? {}
  const sources: unknown[] = []
  const attrsBag = (ctx as any)?.attrs
  if (attrsBag && typeof attrsBag === 'object') sources.push(attrsBag)
  if (nodeProps.attrs && typeof nodeProps.attrs === 'object') sources.push(nodeProps.attrs)
  sources.push(nodeProps)

  const bag: Record<string, unknown> = {}
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue
    for (const [key, value] of Object.entries(src)) {
      if (INTERNAL_KEYS.has(key)) continue
      if (value === undefined) continue
      if (!(key in bag)) bag[key] = value
    }
  }
  return bag
}
