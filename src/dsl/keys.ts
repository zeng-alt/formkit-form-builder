// ═══ 画布身份补齐：为缺少 key 的 DSL 节点补上 key ═════════════════════════════
// key 是画布 DnD / 选中的身份标识（投影为 schema 的 __key），容器内子节点的选中
// 完全依赖它。但并非所有进入设计器的定义都带 key：toPortableDefinition() 会剥离
// key 后交给后端持久化，后端原样取回、外部生成的定义同样没有——这类定义里容器
// 子节点在画布上点不中。
//
// 补齐策略：优先复用节点自己的 id（稳定、确定：同一份无 key 定义每次载入得到
// 相同的 key，不会因为 v-model 往返而抖动）；id 已被别的节点当作 key / id 重复时
// 才生成随机 key，保证整棵树内唯一。
//
// 结构共享：没有任何节点缺 key 时原样返回同一个对象；有缺失时只重建缺失节点
// 到根的那条路径，其余子树复用原引用，便于下游按引用判等。

import type { ContainerNode, FormDefinition, FormNode, LayoutNode } from '../types/dsl'
import { generateKey } from '../utils/dnd/schema'
import { DEFAULT_FORM_SETTINGS } from '../utils/form-layout'

function childrenOf(node: FormNode): FormNode[] | undefined {
  if (node.category === 'container' || node.category === 'layout') {
    const children = (node as ContainerNode | LayoutNode).children
    return Array.isArray(children) ? children : undefined
  }
  return undefined
}

function collectKeys(nodes: FormNode[], used: Set<string>): void {
  for (const node of nodes) {
    if (!node) continue
    if (node.key) used.add(node.key)
    const children = childrenOf(node)
    if (children) collectKeys(children, used)
  }
}

function fillNodes(nodes: FormNode[], used: Set<string>): FormNode[] {
  let changed = false
  const next = nodes.map((node) => {
    if (!node) return node
    let result = node
    const children = childrenOf(node)
    if (children) {
      const nextChildren = fillNodes(children, used)
      if (nextChildren !== children) result = { ...result, children: nextChildren } as FormNode
    }
    if (!node.key) {
      let key = node.id && !used.has(node.id) ? node.id : generateKey()
      while (used.has(key)) key = generateKey()
      used.add(key)
      result = { ...result, key }
    }
    if (result !== node) changed = true
    return result
  })
  return changed ? next : nodes
}

/** 为定义里所有缺少 key 的节点补上 key，并补齐缺失的表单级 settings；
 *  两者都无需改动时返回传入的同一对象。不改动输入。
 *  这是定义进入设计器 / 渲染器的统一规范化入口——settings 在类型上必填，但外部
 *  手写/生成的定义可能整个漏掉，schema-adapter 直接读 settings.labelAlign 会抛错，
 *  在这里兜底而不是让读取处到处 `?.`（见 H2）。 */
export function ensureDslKeys(def: FormDefinition): FormDefinition {
  const withSettings: FormDefinition =
    def && typeof def.settings === 'object' && def.settings !== null
      ? def
      : { ...def, settings: { ...DEFAULT_FORM_SETTINGS } }

  const children = withSettings?.root?.children
  if (!Array.isArray(children)) return withSettings
  const used = new Set<string>()
  collectKeys(children, used)
  const nextChildren = fillNodes(children, used)
  if (nextChildren === children) return withSettings
  return { ...withSettings, root: { ...withSettings.root, children: nextChildren } }
}
