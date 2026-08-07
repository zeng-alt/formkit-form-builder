// ═══ 表达式运行时 ═══════════════════════════════════════════════════════════════
// 扫描 FormKit schema 中带 expr 的字段节点，建立 Vue watch 监听依赖变化，
// 表达式值变化时通过 form 节点 at()/.find() 解析目标节点并调用 node.input() 写入。

import { type Ref, watch, nextTick, onScopeDispose } from 'vue'
import type { FormKitNode, FormKitSchemaFormKit } from '@formkit/core'
import { compileExpr, type CompiledExpr } from './evaluator'

interface WritableNode {
  name?: unknown
  children?: unknown[]
  expr?: unknown
  props?: Record<string, unknown> & { modelValue?: unknown[] }
}

export interface ExprBinding {
  name: string
  compiled: CompiledExpr
}

/**
 * 扫描 schema 中的 expr 字段，编译表达式，建立 watch。
 * 依赖变化时求值，并把结果写入对应 FormKit 字段节点。
 * @param getFormNode 提供表单根节点（渲染后可用），用于按 name 定位目标字段
 */
export function useExprRun(
  formData: Ref<Record<string, unknown>>,
  schema: Ref<FormKitSchemaFormKit[]>,
  getFormNode: () => FormKitNode | null,
): void {
  let stopFns: (() => void)[] = []

  /** 在表单节点树内按 name 解析目标节点（BFS，兼容嵌套容器） */
  const resolveNode = (name: string) => {
    const form = getFormNode()
    if (!form) return undefined
    return (form as any).find?.(name) ?? (form as any).at?.(name)
  }

  const setup = () => {
    // 清理旧监听
    for (const stop of stopFns) stop()
    stopFns = []

    const nodes = schema.value
    if (!Array.isArray(nodes) || !nodes.length) return

    const bindings = collectExprBindings(nodes)
    if (!bindings.length) return

    const write = (binding: ExprBinding) => {
      try {
        const result = binding.compiled.evaluate(formData.value)
        const target = resolveNode(binding.name)
        if (target) target.input(result)
      } catch {
        // 求值失败静默
      }
    }

    for (const binding of bindings) {
      const { compiled } = binding

      const stop = watch(
        compiled.deps.length
          ? compiled.deps.map((dep) => () => formData.value[dep])
          : () => binding.name,
        () => write(binding),
        { immediate: true },
      )
      stopFns.push(stop)
    }
  }

  // 首屏：延迟到 FormKit 节点创建完毕
  nextTick(setup)

  // 当 schema 或表单节点可用时重建
  watch(() => schema.value, () => nextTick(setup), { deep: true })
  watch(getFormNode, () => nextTick(setup))

  onScopeDispose(() => {
    for (const stop of stopFns) stop()
    stopFns = []
  })
}

/** 递归扫描 schema 树，提取所有带 expr 的字段节点，编译表达式 */
function collectExprBindings(
  nodes: unknown[],
  bindings: ExprBinding[] = [],
): ExprBinding[] {
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const n = node as WritableNode

    if (typeof n.expr === 'string' && n.expr && typeof n.name === 'string' && n.name) {
      try {
        const compiled = compileExpr(n.expr)
        bindings.push({ name: n.name, compiled })
      } catch {
        console.warn(`[expr-runtime] 表达式编译失败: ${n.name} = ${n.expr}`)
      }
    }

    if (Array.isArray(n.children)) {
      collectExprBindings(n.children, bindings)
    }
    if (Array.isArray(n.props?.modelValue)) {
      collectExprBindings(n.props.modelValue, bindings)
    }
  }

  return bindings
}
