// ═══ 字段引用收集与批量改名 ═══════════════════════════════════════════════════
// 纯函数，遍历整棵表单定义找出"引用某字段名"的位置：条件/表达式 AST（visibleIf 及
// 任务 G 新增的 requiredIf/disabledIf/readonlyIf）、expr 表达式字符串、confirm 类
// 校验规则、数据表格列元素（来源字段节点，与主树同构，按同一套规则递归）。
// 字段改名（NameInput.vue）与表单体检（lint.ts）共用这一套收集逻辑。

import type {
  ContainerNode,
  Expr,
  FieldNode,
  FormDefinition,
  FormNode,
  LayoutNode,
  ValidationRule,
} from '../types/dsl'
import { exprToSource, isUnparsedExpr } from './expr-source'
import { parseExprString } from './convert/expr-parse'

/** 节点上所有"布尔表达式 AST"类型的键：visibleIf 是条件渲染，requiredIf/disabledIf/
 *  readonlyIf 是条件必填/禁用/只读（任务 G 新增，见 src/types/dsl.ts）。这里按宽松
 *  类型读取（node as Record<string, unknown>），不依赖 FieldNode 类型定义是否已经
 *  加上后三个键——两个任务并行开发，本文件不等对方落地类型定义就能先用。 */
export const NODE_EXPR_KEYS = ['visibleIf', 'requiredIf', 'disabledIf', 'readonlyIf'] as const

export type NodeExprKey = (typeof NODE_EXPR_KEYS)[number]

/** 数据表格列（宽松结构，只取用得到的 element 字段；完整定义见
 *  src/components/ui/containers/data-table/types.ts，DSL 层不反向依赖组件层类型）。 */
interface ColumnLike {
  element?: FieldNode
  [key: string]: unknown
}

/** 引用点位置：expr-key 对应 NODE_EXPR_KEYS 里的某个键；expr 对应字段的表达式字符串
 *  （FieldNode.expr）；validation 对应以字段名为参数的校验规则（如 confirm）。 */
type FieldRefLocation =
  | { kind: 'expr-key'; exprKey: NodeExprKey }
  | { kind: 'expr' }
  | { kind: 'validation'; rule: string }

export interface FieldRef {
  /** 引用所在节点的 key（画布身份标识，缺失时退回 id） */
  nodeKey: string
  /** 引用所在节点的类型（fieldProps 目录里的 type），供 UI 展示 */
  nodeType: string
  /** 引用点位置 */
  location: FieldRefLocation
  /** 引用的字段名 */
  fieldName: string
  /** 引用点若位于数据表格列元素内：所属数据表格节点的 key */
  dataTableKey?: string
  /** 引用点若位于数据表格列元素内：所属列下标 */
  columnIndex?: number
}

function nodeKeyOf(node: FormNode): string {
  return node.key ?? node.id
}

function childrenOf(node: FormNode): FormNode[] {
  if (node.category === 'container' || node.category === 'layout') {
    const children = (node as ContainerNode | LayoutNode).children
    return Array.isArray(children) ? children : []
  }
  return []
}

function columnsOf(node: FormNode): ColumnLike[] {
  const cols = (node as { props?: Record<string, unknown> }).props?.columns
  return Array.isArray(cols) ? (cols as ColumnLike[]) : []
}

function exprKeyValue(node: FormNode, key: NodeExprKey): Expr | undefined {
  return (node as unknown as Record<string, Expr | undefined>)[key]
}

/** 收集一个 Expr AST 里所有 field 引用的名字（去重） */
function collectExprFieldNames(expr: Expr | undefined, out: Set<string>): void {
  if (!expr) return
  if (expr.type === 'field') {
    out.add(expr.name)
    return
  }
  if (expr.type === 'call') {
    for (const arg of expr.args) collectExprFieldNames(arg, out)
  }
}

/** Expr AST 里把字段名 oldName 替换成 newName；结构共享——未命中的子树原样返回同一引用 */
function renameExprFieldNames(
  expr: Expr,
  oldName: string,
  newName: string,
): { expr: Expr; count: number } {
  if (expr.type === 'field') {
    if (expr.name === oldName) return { expr: { ...expr, name: newName }, count: 1 }
    return { expr, count: 0 }
  }
  if (expr.type === 'call') {
    let count = 0
    let changed = false
    const nextArgs = expr.args.map((arg) => {
      const r = renameExprFieldNames(arg, oldName, newName)
      count += r.count
      if (r.expr !== arg) changed = true
      return r.expr
    })
    if (!changed) return { expr, count: 0 }
    return { expr: { ...expr, args: nextArgs }, count }
  }
  return { expr, count: 0 }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** expr 字符串解析失败（isUnparsedExpr）时的兜底：按 $name 词边界做正则替换，
 *  不会误伤 $name2（负向先行断言要求后面不能紧跟标识符字符）；不追求（也做不到）
 *  避开字符串字面量里凑巧出现的同名片段——既然解析都失败了，没有更可靠的办法，
 *  这是"安全"而非"完美"的兜底。替换函数写法而非字符串模板，避免 newName 恰好
 *  匹配 $&/$1 等 String.replace 特殊占位符语义。 */
function regexRenameFieldToken(str: string, oldName: string, newName: string): string {
  const re = new RegExp(`\\$${escapeRegExp(oldName)}(?![A-Za-z0-9_])`, 'g')
  return str.replace(re, () => `$${newName}`)
}

/** 同上：只探测是否存在引用，不替换（用于 collectFieldRefs 兜底） */
function regexHasFieldToken(str: string, name: string): boolean {
  const re = new RegExp(`\\$${escapeRegExp(name)}(?![A-Za-z0-9_])`)
  return re.test(str)
}

function confirmRuleFieldName(rule: ValidationRule): string | undefined {
  if (rule.rule !== 'confirm') return undefined
  const name = rule.args?.[0]
  return typeof name === 'string' && name ? name : undefined
}

/** 收集一个字段节点自身的引用点（expr 字符串 + confirm 类校验规则），
 *  不含 NODE_EXPR_KEYS（由调用方统一处理，字段/容器/布局节点共用）。 */
function collectFieldOwnRefs(
  node: FieldNode,
  nodeKey: string,
  table?: { key: string; index: number },
  out: FieldRef[] = [],
): FieldRef[] {
  if (typeof node.expr === 'string' && node.expr.trim()) {
    const ast = parseExprString(node.expr)
    const unparsed = isUnparsedExpr(ast)
    const names = new Set<string>()
    if (!unparsed) collectExprFieldNames(ast, names)
    for (const name of names) {
      out.push({
        nodeKey,
        nodeType: node.type,
        location: { kind: 'expr' },
        fieldName: name,
        dataTableKey: table?.key,
        columnIndex: table?.index,
      })
    }
  }
  if (Array.isArray(node.validation)) {
    for (const rule of node.validation) {
      const name = confirmRuleFieldName(rule)
      if (!name) continue
      out.push({
        nodeKey,
        nodeType: node.type,
        location: { kind: 'validation', rule: rule.rule },
        fieldName: name,
        dataTableKey: table?.key,
        columnIndex: table?.index,
      })
    }
  }
  return out
}

/** 列出定义里所有"引用某字段名"的位置（见文件头注释的覆盖范围）。
 *  事件绑定代码（EventBinding.handler）是不透明字符串，不在此列——见 lint.ts 的
 *  单独提示。 */
export function collectFieldRefs(definition: FormDefinition): FieldRef[] {
  const out: FieldRef[] = []

  const visit = (node: FormNode, table?: { key: string; index: number }) => {
    const nodeKey = nodeKeyOf(node)
    for (const exprKey of NODE_EXPR_KEYS) {
      const expr = exprKeyValue(node, exprKey)
      if (!expr) continue
      const names = new Set<string>()
      collectExprFieldNames(expr, names)
      for (const name of names) {
        out.push({
          nodeKey,
          nodeType: node.type,
          location: { kind: 'expr-key', exprKey },
          fieldName: name,
          dataTableKey: table?.key,
          columnIndex: table?.index,
        })
      }
    }
    if (node.category === 'field') collectFieldOwnRefs(node as FieldNode, nodeKey, table, out)

    // 数据表格列：element 是与主树同构的字段节点，按同一套规则递归（含它自己的
    // NODE_EXPR_KEYS/expr/validation），只是不再往下找子节点（字段节点没有 children）。
    const cols = columnsOf(node)
    cols.forEach((col, index) => {
      if (!col.element) return
      visit(col.element as unknown as FormNode, { key: nodeKey, index })
    })

    for (const child of childrenOf(node)) visit(child, table)
  }

  for (const child of definition?.root?.children ?? []) visit(child)
  return out
}

/** 字段改名：把整棵定义里对 oldName 的引用（不含该字段自己的 name 声明，那由
 *  调用方另行处理）批量替换成 newName，返回新定义与实际改动的引用点数。
 *  oldName/newName 相同或为空时原样返回（count: 0）。 */
export function renameFieldRefs(
  definition: FormDefinition,
  oldName: string,
  newName: string,
): { definition: FormDefinition; count: number } {
  if (!oldName || !newName || oldName === newName) return { definition, count: 0 }
  let count = 0

  // NODE_EXPR_KEYS：字段/容器/布局/静态节点通用
  const renameExprKeys = (node: FormNode): FormNode => {
    let next = node
    for (const exprKey of NODE_EXPR_KEYS) {
      const expr = exprKeyValue(next, exprKey)
      if (!expr) continue
      const r = renameExprFieldNames(expr, oldName, newName)
      if (r.count > 0) {
        count += r.count
        next = { ...next, [exprKey]: r.expr } as FormNode
      }
    }
    return next
  }

  // 字段节点专属：expr 字符串 + confirm 类校验规则
  const renameFieldOwn = (node: FieldNode): FieldNode => {
    let next = node
    if (typeof next.expr === 'string' && next.expr.trim()) {
      const ast = parseExprString(next.expr)
      if (!isUnparsedExpr(ast)) {
        const r = renameExprFieldNames(ast, oldName, newName)
        if (r.count > 0) {
          count += r.count
          next = { ...next, expr: exprToSource(r.expr) }
        }
      } else if (regexHasFieldToken(next.expr, oldName)) {
        // 内置语法解析失败：退回安全的正则替换（见 regexRenameFieldToken 注释）
        next = { ...next, expr: regexRenameFieldToken(next.expr, oldName, newName) }
        count += 1
      }
    }
    if (Array.isArray(next.validation)) {
      let changed = false
      const nextValidation = next.validation.map((rule) => {
        if (confirmRuleFieldName(rule) !== oldName) return rule
        changed = true
        count += 1
        return { ...rule, args: [newName, ...(rule.args?.slice(1) ?? [])] }
      })
      if (changed) next = { ...next, validation: nextValidation }
    }
    return next
  }

  // 字段节点（树内 / 数据表格列 element 共用）：先替换表达式键，再替换字段专属位置
  const renameFieldNode = (node: FieldNode): FieldNode =>
    renameFieldOwn(renameExprKeys(node) as FieldNode)

  const renameColumns = (node: FormNode): FormNode => {
    const cols = columnsOf(node)
    if (!cols.length) return node
    let changed = false
    const nextCols = cols.map((col) => {
      if (!col.element) return col
      const nextElement = renameFieldNode(col.element)
      if (nextElement === col.element) return col
      changed = true
      return { ...col, element: nextElement }
    })
    if (!changed) return node
    return {
      ...node,
      props: { ...(node as { props?: Record<string, unknown> }).props, columns: nextCols },
    } as FormNode
  }

  const visit = (node: FormNode): FormNode => {
    let next = node.category === 'field' ? renameFieldNode(node as FieldNode) : renameExprKeys(node)
    next = renameColumns(next)
    const children = childrenOf(next)
    if (children.length) {
      let childrenChanged = false
      const nextChildren = children.map((child) => {
        const r = visit(child)
        if (r !== child) childrenChanged = true
        return r
      })
      if (childrenChanged) next = { ...next, children: nextChildren } as FormNode
    }
    return next
  }

  const rootChildren = definition?.root?.children
  if (!Array.isArray(rootChildren) || !rootChildren.length) return { definition, count: 0 }
  let rootChanged = false
  const nextRootChildren = rootChildren.map((child) => {
    const r = visit(child)
    if (r !== child) rootChanged = true
    return r
  })
  if (!rootChanged) return { definition, count: 0 }
  return {
    definition: { ...definition, root: { ...definition.root, children: nextRootChildren } },
    count,
  }
}
