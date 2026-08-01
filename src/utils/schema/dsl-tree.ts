import type { ContainerNode, FormNode, LayoutNode } from '@/types/dsl'

export interface DslPathNode {
  node: FormNode
  parent: FormNode | null
  /** 所在根级子树的根下标（画布选中回退用） */
  rootIndex: number
  index: number
}

export function dslChildrenOf(node: FormNode): FormNode[] {
  if (node.category === 'container' || node.category === 'layout') {
    return (node as ContainerNode | LayoutNode).children ?? []
  }
  return []
}

export function findDslNodeByKey(nodes: FormNode[], key: string): DslPathNode | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (!node) continue
    if (node.key === key || node.id === key) {
      return { node, parent: null, rootIndex: i, index: i }
    }
    const children = dslChildrenOf(node)
    if (children.length) {
      const found = findDslNodeByKey(children, key)
      if (found) return { node: found.node, parent: node, rootIndex: i, index: found.index }
    }
  }
  return null
}
