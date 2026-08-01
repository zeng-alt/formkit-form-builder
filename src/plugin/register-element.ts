// ═══ 用户扩展元素入口（配置式：BuilderProvider 传 config.elements / 手动注册）═══
// 单条注册同时打通：
//   - DSL 注册表（toSchema / fromSchema / match / defaults，来自模板钩子或分类默认）
//   - FormKit input 绑定（renderAs:'cmp'/'formkit' 的元素需 component，buildFormkitInputs 合并）
//   - 容器画布/预览绑定（category==='container' 时传 canvas/preview 组件）
// 物料面板（createFieldProps / createDefaultFormElements / schema 库）随注册表自动出现。

import type { Component } from 'vue'
import type { ElementCatalogEntry, ElementTemplate } from '../dsl/registry'
import { registerElementType, elementTypeFromSchema, getElementTypeDef } from '../dsl/registry'
import type { ContainerDefinition } from '../elements/canvas'
import { registerContainerDefinition } from '../elements/canvas'
import { registerFormkitBinding } from '../elements/formkit'

export interface RegisterElementInput extends Omit<ElementCatalogEntry, 'schema'> {
  /** DSL 默认模板（含可选 toSchema/fromSchema/match 钩子） */
  schema: ElementTemplate
  /** FormKit 输入组件（field/static 必填；renderAs:'cmp' 时经 schema 库渲染） */
  component?: Component
  /** createInput 包装选项（wrap=false 直连组件） */
  wrap?: boolean
  /** FormKit 透传 props 白名单 */
  props?: string[]
  /** 容器画布组件（category==='container' 时可选） */
  canvas?: Component
  /** 容器预览组件（category==='container' 时可选） */
  preview?: Component
  /** 容器归一化 / 预览格式化（缺省走通用 listKey/modelValue 约定） */
  normalize?: ContainerDefinition['normalize']
  formatPreview?: ContainerDefinition['formatPreview']
  /** 允许覆盖已注册类型（含内置） */
  overwrite?: boolean
}

function containerMatch(type: string) {
  return (node: unknown) => {
    const n: any = node
    if (!n || typeof n !== 'object') return false
    return n.$cmp === type || n.$formkit === type
  }
}

export function registerElement(input: RegisterElementInput): void {
  const { type, overwrite } = input
  registerElementType(elementTypeFromSchema(input), overwrite)

  if (input.component) {
    registerFormkitBinding(type, {
      component: input.component,
      wrap: input.wrap,
      props: input.props,
      libraryName: input.schema.target ?? type,
    })
  }

  if (input.category === 'container' && (input.canvas || input.preview)) {
    const containerDef: ContainerDefinition = {
      id: type,
      match: containerMatch(type),
      canvas: input.canvas ? { libraryKey: type, component: input.canvas } : undefined,
      preview: input.preview ? { libraryKey: type, component: input.preview } : undefined,
      normalize: input.normalize ?? defaultContainerNormalize(type),
      formatPreview: input.formatPreview ?? defaultContainerFormat(type),
    }
    registerContainerDefinition(containerDef)
  }
}

/** 通用容器归一化：补齐 keyProp / modelValue（与内置 list/card 约定一致） */
function defaultContainerNormalize(type: string): NonNullable<ContainerDefinition['normalize']> {
  const keyProp = `${type}Key`
  return (node) => {
    const next: any = { ...node }
    next.$cmp = next.$cmp || type
    next.children = Array.isArray(next.children) ? next.children : []
    const props = typeof next.props === 'object' && next.props ? { ...next.props } : {}
    props[keyProp] = typeof props[keyProp] === 'string' && props[keyProp] ? props[keyProp] : ((next.__key as string | undefined) ?? '')
    props.modelValue = next.children
    next.props = props
    return next
  }
}

/** 通用预览格式化：$el div 包裹 $cmp 容器（与内置 formatContainer 一致） */
function defaultContainerFormat(type: string): NonNullable<ContainerDefinition['formatPreview']> {
  const keyProp = `${type}Key`
  return (node, ctx) => {
    const normalized = defaultContainerNormalize(type)(node)
    const children = Array.isArray(normalized.children)
      ? (normalized.children as any[]).map((c, i) => ctx.format(c, i))
      : []
    const schemaIf = (normalized as any).if
    const nextNode: any = {
      $el: 'div',
      attrs: { class: (normalized as any).outerClass || 'col-span-12' },
      children: [
        {
          $cmp: type,
          props: {
            ...(normalized as any).props,
            [keyProp]: ((normalized as any).props?.[keyProp] as string | undefined) ?? '',
            modelValue: children,
          },
        },
      ],
    }
    if (typeof schemaIf === 'string' && schemaIf.trim()) nextNode.if = schemaIf
    else if (typeof schemaIf === 'boolean') nextNode.if = schemaIf
    return nextNode as any
  }
}

export function registerElements(inputs: RegisterElementInput[] | undefined): void {
  if (!inputs?.length) return
  for (const input of inputs) {
    // 配置式注册幂等：重复（含重复挂载）直接覆盖，避免抛错
    registerElement({ ...input, overwrite: true })
  }
}

export function hasRegisteredElement(type: string): boolean {
  return Boolean(getElementTypeDef(type))
}
