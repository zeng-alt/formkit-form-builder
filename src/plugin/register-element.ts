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
import { registerContainerDefinition, normalizeContainer, formatContainer } from '../elements/canvas'
import type { ContainerSpec } from '../elements/container-spec'
import { registerFormkitBinding } from '../elements/formkit'

export interface RegisterElementInput extends Omit<ElementCatalogEntry, 'schema'> {
  /** DSL 默认模板（含可选 toSchema/fromSchema/match 钩子） */
  schema: ElementTemplate
  /** FormKit 输入组件（field/static 必填；renderAs:'cmp' 时经 schema 库渲染） */
  component?: Component
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
      libraryName: input.schema.target ?? type,
    })
  }

  if (input.category === 'container' && (input.canvas || input.preview)) {
    // 自定义容器：归一化/预览格式统一走通用实现。缺省按"无数据结构"（none）处理，
    // 与旧 defaultContainerFormat 行为一致（不包 group）；需要产出 object/array 数据时，
    // 在 input.container 里声明数据结构即可（与内置容器同一机制）。
    const spec: ContainerSpec = input.container ?? {
      dataShape: 'none',
      keyProp: `${type}Key`,
      primitive: 'cmp',
    }
    const containerDef: ContainerDefinition = {
      id: type,
      match: containerMatch(type),
      canvas: input.canvas ? { libraryKey: type, component: input.canvas } : undefined,
      preview: input.preview ? { libraryKey: type, component: input.preview } : undefined,
      normalize: input.normalize ?? ((node) => normalizeContainer(node, type, spec)),
      formatPreview: input.formatPreview ?? ((node, ctx) => formatContainer(node, ctx, type, spec)),
    }
    registerContainerDefinition(containerDef)
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
