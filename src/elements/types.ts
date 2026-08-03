import type { Component } from 'vue'
import type { NodeCategory } from '../types/dsl'
import type { ElementCatalogEntry } from '../dsl/registry'

// 元素分类：与 DSL 的 NodeCategory 对齐（field / container / layout / static）
export type ElementCategory = NodeCategory

// 右侧属性编辑器（懒加载）
export type ElementEditor = () => Promise<{ default: Component }>

// 元素注册定义（纯数据，不含 .vue）：
// 与 dsl/registry.ts 的 ElementCatalogEntry 同构，保留此公共别名作为唯一来源。
export type ElementDefinition = ElementCatalogEntry

// 左侧面板展示信息（tooltip 已翻译）
export interface ElementPaletteProp {
  name: string
  tooltip: string
  icon: string
  category: NodeCategory
}
