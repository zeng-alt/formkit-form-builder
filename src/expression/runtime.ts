// ═══ 表达式运行时 ═══════════════════════════════════════════════════════════════
// 扫描 FormKit schema 中带 expr 的字段节点，建立 Vue watch 监听依赖变化，
// 表达式值变化时通过 form 节点 at()/.find() 解析目标节点并调用 node.input() 写入。

import { type Ref, watch, nextTick, onScopeDispose } from 'vue'
import type { FormKitNode, FormKitSchemaFormKit } from '@formkit/core'
import { compileExpr, type CompiledExpr } from './evaluator'
import { lookupFieldValue } from '../utils/schema/form-data'

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

// ─── 表达式依赖环检测（静态，setup 时跑一次，运行时零开销）─────────────────────

export interface ExprCycleResult {
  /** 处在某条环上的字段名（含自环） */
  cyclicNames: Set<string>
  /** 每条环的完整路径，如 ['a', 'b', 'a'] */
  cycles: string[][]
}

/**
 * 在“被表达式驱动的字段”之间找环：依赖普通输入字段（不在 bindings 里）不构成环，
 * 只有 A.expr 依赖 B、B.expr 又（直接或间接）依赖回 A 时才算。DFS 三色标记，
 * 找到的每条回边对应一条环路径；自引用（deps 含自身）是环长度为 1 的特例，
 * 同一套逻辑自然覆盖，不需要单独判断。
 */
export function findExprCycles(bindings: ExprBinding[]): ExprCycleResult {
  const names = new Set(bindings.map((b) => b.name))
  const graph = new Map<string, string[]>()
  for (const b of bindings) {
    graph.set(
      b.name,
      b.compiled.deps.filter((dep) => names.has(dep)),
    )
  }

  const cyclicNames = new Set<string>()
  const cycles: string[][] = []
  const UNVISITED = 0,
    IN_STACK = 1,
    DONE = 2
  const color = new Map<string, 0 | 1 | 2>()
  const stack: string[] = []

  const visit = (node: string) => {
    color.set(node, IN_STACK)
    stack.push(node)
    for (const dep of graph.get(node) ?? []) {
      const depColor = color.get(dep) ?? UNVISITED
      if (depColor === UNVISITED) {
        visit(dep)
      } else if (depColor === IN_STACK) {
        // dep 已在栈上：从 dep 到当前栈顶再回到 dep，构成一条完整环路径
        const idx = stack.indexOf(dep)
        const cyclePath = [...stack.slice(idx), dep]
        cycles.push(cyclePath)
        for (const n of stack.slice(idx)) cyclicNames.add(n)
      }
    }
    stack.pop()
    color.set(node, DONE)
  }

  for (const name of names) {
    if ((color.get(name) ?? UNVISITED) === UNVISITED) visit(name)
  }

  return { cyclicNames, cycles }
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
    // find 是 FormKitNode 公开类型声明的方法；at 是运行时存在但公开类型未声明的
    // 内部查找方法（按路径/index 查找，find 按 selector 查找，语义不同，一个查不到
    // 时另一个可能查得到），类型缺失只能保留 as any
    return form.find?.(name) ?? (form as any).at?.(name)
  }

  const setup = () => {
    // 清理旧监听
    for (const stop of stopFns) stop()
    stopFns = []

    const nodes = schema.value
    if (!Array.isArray(nodes) || !nodes.length) return

    const bindings = collectExprBindings(nodes)
    if (!bindings.length) return

    // 静态环检测：两节点环（A 依赖 B、B 依赖 A）、自环（A 依赖自身）都会让
    // target.input() 互相触发 watch，值不收敛就无限循环。这里在建 watch 前
    // 一次性找出所有环上的字段，跳过它们的 watch（字段仍可手工输入，只是不
    // 参与表达式联动），运行时零额外开销。
    const { cyclicNames, cycles } = findExprCycles(bindings)
    if (cycles.length) {
      console.warn(
        `[expr-runtime] 检测到表达式依赖环，已跳过建立监听（字段仍可手动输入）：\n` +
          cycles.map((c) => `  ${c.join(' → ')}`).join('\n'),
      )
    }

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
      if (cyclicNames.has(binding.name)) continue
      const { compiled } = binding

      const stop = watch(
        compiled.deps.length
          ? // 按字段名查找依赖当前值：dataStructure:'nested' 下依赖字段可能嵌套在
            // 容器 group 里，formData.value[dep] 只看根层会取不到（见 evaluator.ts
            // compileExpr 的注释），watch 的依赖源要跟求值时用的是同一套查找逻辑，
            // 否则依赖字段变化时可能不触发重新求值
            compiled.deps.map((dep) => () => lookupFieldValue(formData.value, dep))
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
  watch(
    () => schema.value,
    () => nextTick(setup),
    { deep: true },
  )
  watch(getFormNode, () => nextTick(setup))

  onScopeDispose(() => {
    for (const stop of stopFns) stop()
    stopFns = []
  })
}

/** 递归扫描 schema 树，提取所有带 expr 的字段节点，编译表达式 */
function collectExprBindings(nodes: unknown[], bindings: ExprBinding[] = []): ExprBinding[] {
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    const n = node as WritableNode
    const props = (n.props ?? {}) as Record<string, unknown>

    // $formkit 节点 expr/name 在顶层；$cmp / $el 节点收进 props（见 fieldNodeToSchema）
    const name = typeof n.name === 'string' ? n.name : props.name
    const expr = typeof n.expr === 'string' ? n.expr : props.expr

    if (typeof name === 'string' && name && typeof expr === 'string' && expr) {
      try {
        const compiled = compileExpr(expr)
        bindings.push({ name, compiled })
      } catch {
        console.warn(`[expr-runtime] 表达式编译失败: ${name} = ${expr}`)
      }
    }

    if (Array.isArray(n.children)) {
      collectExprBindings(n.children, bindings)
    }
    if (Array.isArray(props.modelValue)) {
      collectExprBindings(props.modelValue, bindings)
    }
  }

  return bindings
}
