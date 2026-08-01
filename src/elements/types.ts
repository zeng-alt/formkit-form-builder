import type { Component } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'

// 元素分类：字段 / 容器结构 / 静态展示
export type ElementCategory = 'fields' | 'structure' | 'static'

// 画布/左侧面板默认 Schema（可含 i18n key，创建实例时由 createDefaultFormElements 解析）
export type ElementSchemaDef = Omit<
  FormKitSchemaFormKit,
  'name' | 'label' | 'placeholder' | 'help' | 'description'
> & {
  nameKey: string
  labelKey?: string
  placeholderKey?: string
  helpKey?: string
  descriptionKey: string
}

// 右侧属性编辑器（懒加载）
export type ElementEditor = () => Promise<{ default: Component }>

// FormKit input 注册信息（$formkit 元素用于画布/预览渲染）
export interface ElementFormkitDef {
  component: Component
  /** false 表示直接 createInput(component)；默认 true（createUiInput 包装） */
  wrap?: boolean
  /** wrap=true 时 $cmp 名称 */
  libraryName?: string
  family?: string
  props?: string[]
}

// 元素注册定义：一次注册，同时驱动 左侧面板 / 画布 / 右侧属性面板
export interface ElementDefinition {
  /** 元素类型名：$formkit 或 $cmp 的值 */
  type: string
  category: ElementCategory
  /** 左侧面板图标（i-lucide-* 等） */
  icon: string
  /** 右侧面板 header tooltip 的 i18n key */
  tooltipKey: string
  /** 默认 Schema（拖入画布的初始状态） */
  schema: ElementSchemaDef
  /** 右侧属性编辑器 */
  editor?: ElementEditor
  /** FormKit 渲染注册（$formkit 元素必填；$cmp 容器元素走 schemaLibrary） */
  formkit?: ElementFormkitDef
}

// 左侧面板展示信息（tooltip 已翻译）
export interface ElementPaletteProp {
  name: string
  tooltip: string
  icon: string
  category: ElementCategory
}
