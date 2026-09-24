// ═══ 表单模板构造小工具 ═════════════════════════════════════════════════════════
// 统一走 getElementTypeDef(type).defaults()（与画布拖入元素同一条产出路径），保证
// 模板字段与当前元素定义（默认属性、schema 形态）始终一致，不会因为手写节点结构
// 而在元素定义演进后悄悄跑偏。

import { getElementTypeDef } from '@/dsl'
import type { ContainerNode, FieldNode, FormNode, LayoutNode } from '@/types/dsl'

/** 构造一个字段节点：defaults() 之上按需覆盖 name/label/props/options/value。 */
export function makeField(
  type: string,
  overrides: Partial<Omit<FieldNode, 'props'>> & { props?: Record<string, unknown> } = {},
): FieldNode {
  const def = getElementTypeDef(type)
  if (!def) throw new Error(`[templates] 未注册的元素类型: ${type}`)
  const base = def.defaults() as FieldNode
  const { props, ...rest } = overrides
  return {
    ...base,
    ...rest,
    props: props ? { ...base.props, ...props } : base.props,
  }
}

/** 构造一个容器/布局节点（card 等）：defaults() 之上覆盖 label/props，并塞入子节点。 */
export function makeContainer(
  type: string,
  overrides: { label?: string; props?: Record<string, unknown> },
  children: FormNode[],
): ContainerNode | LayoutNode {
  const def = getElementTypeDef(type)
  if (!def) throw new Error(`[templates] 未注册的元素类型: ${type}`)
  const base = def.defaults() as ContainerNode | LayoutNode
  return {
    ...base,
    ...(overrides.label !== undefined ? { label: overrides.label } : {}),
    props: overrides.props ? { ...base.props, ...overrides.props } : base.props,
    children,
  }
}

/** 表单末尾的提交按钮：submit 静态元素的显示文案存在 props.text（画布内联编辑读写），
 *  同时补一份 label 保持与画布拖入的默认元素一致（见 elements/registry.ts 的
 *  defaultDslNodeFromTemplate 同款处理）。 */
export function submitButton(t: (key: string) => string): FormNode {
  const def = getElementTypeDef('submit')
  if (!def) throw new Error('[templates] 未注册的元素类型: submit')
  const node = def.defaults() as FormNode & { props?: Record<string, unknown> }
  const label = t('elements.submit.label')
  node.label = label
  node.props = { ...node.props, text: label }
  return node
}
