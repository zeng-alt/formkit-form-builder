import type { Component } from 'vue'
import type { NodeCategory } from '../types/dsl'
import type { ElementTemplate } from '../dsl/registry'

// 元素分类：与 DSL 的 NodeCategory 对齐（field / container / layout / static）
export type ElementCategory = NodeCategory

// 右侧属性编辑器（懒加载）
export type ElementEditor = () => Promise<{ default: Component }>

// 元素注册定义（纯数据，不含 .vue）：
// 注册到统一 DSL 注册表（src/dsl/registry.ts → elementTypeFromSchema）；
// FormKit 组件绑定在 src/elements/formkit.ts、容器画布/预览组件在 src/elements/canvas.ts（均按 type 索引）。
export interface ElementDefinition {
  /** 元素类型名：注册表 type（$cmp target / $formkit 名） */
  type: string
  category: NodeCategory
  /** 左侧面板图标（i-lucide-* 等） */
  icon: string
  /** 右侧面板 header tooltip 的 i18n key */
  tooltipKey: string
  /** 默认 DSL 模板（拖入画布的初始状态 + 左侧面板名称/描述） */
  schema: ElementTemplate
  /** 右侧属性编辑器 */
  editor?: ElementEditor
}

// 左侧面板展示信息（tooltip 已翻译）
export interface ElementPaletteProp {
  name: string
  tooltip: string
  icon: string
  category: NodeCategory
}
