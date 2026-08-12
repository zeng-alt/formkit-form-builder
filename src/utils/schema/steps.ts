import type { FormKitSchemaFormKit } from '@formkit/core'

// 步骤向导（steps）专属 schema 工具：全局唯一 + 根画布独占拖放区约束共用同一棵树扫描。
// 拖入特判（utils/dnd/commit.ts）与根 drop-area 的 accepts 校验都依赖它。

/** 整个 schema 树中是否已存在 steps 容器（含 steps 的 props.modelValue 内嵌 pane） */
export function schemaContainsSteps(nodes: FormKitSchemaFormKit[]): boolean {
  for (const n of nodes as any[]) {
    if (!n || typeof n !== 'object') continue
    if (n.$cmp === 'steps' || n.$formkit === 'steps') return true
    if (Array.isArray(n.children) && schemaContainsSteps(n.children)) return true
    if (Array.isArray(n.props?.modelValue) && schemaContainsSteps(n.props.modelValue)) return true
  }
  return false
}
