// ═══ 内置 DSL 元素类型注册 ════════════════════════════════════════════════════
// 元素目录（src/elements/definitions/*，纯数据）统一经 elementTypeFromSchema 注册；
// 本文件只保留非目录的基础设施类型（grid·row·column 布局 / tabsPane /
// 原生 $el 静态 button·paragraph·heading·divider）。
// 渲染层绑定（组件）在 src/elements/formkit.ts + canvas.ts，不在此处。

import {
  registerElementType,
  fieldType,
  containerType,
  layoutType,
  staticType,
  tabsPaneType,
  elementTypeFromSchema,
} from './registry'
import { fieldElements } from '../elements/definitions/fields'
import { staticElements } from '../elements/definitions/static'
import { containerElements } from '../elements/definitions/containers'

let builtinRegistered = false

export function registerBuiltinElementTypes(): void {
  if (builtinRegistered) return
  builtinRegistered = true

  // ─── 元素目录（纯数据 → DSL 注册表）──────────────────────────────────────────
  for (const def of [...fieldElements, ...staticElements, ...containerElements]) {
    registerElementType(elementTypeFromSchema(def))
  }

  // ─── 布局 ────────────────────────────────────────────────────────────────────
  // grid/row/column 输出 $el: div（target 覆盖，type 为 DSL 逻辑名）
  registerElementType(layoutType('grid', { target: 'div' }))
  registerElementType(layoutType('row', { target: 'div' }))
  registerElementType(layoutType('column', { target: 'div' }))
  registerElementType(tabsPaneType())

  // ─── 静态展示：原生 $el 元素（无目录，画布直接输出 HTML 标签）─────────────────
  registerElementType(staticType('button', { match: (s) => (s as any).$el === 'button' }))
  registerElementType(staticType('paragraph', { match: (s) => (s as any).$el === 'p' }))
  registerElementType(
    staticType('heading', { match: (s) => /^h[1-6]$/.test(String((s as any).$el)) }),
  )
  registerElementType(staticType('divider', { match: (s) => (s as any).$el === 'hr' }))
}

export { fieldType, containerType, layoutType, staticType, tabsPaneType }
