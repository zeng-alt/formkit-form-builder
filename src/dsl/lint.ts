// ═══ 表单体检：纯函数一次遍历，检查定义里常见的低级问题 ═══════════════════════════
// UI 层（IssuesPanel.vue）只负责渲染 Issue 列表 + 定位，文案统一用 i18n 按 code
// 拼（issues.<code>），不在这里拼中文。

import type { ContainerNode, Expr, FieldNode, FormDefinition, FormNode } from '../types/dsl'
import { isUnparsedExpr } from './expr-source'
import { parseExprString } from './convert/expr-parse'
import { NODE_EXPR_KEYS, collectFieldRefs, type NodeExprKey } from './refs'

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface Issue {
  severity: IssueSeverity
  /** 问题类型，UI 层据此选文案 key（issues.<code>）与图标 */
  code: string
  /** 问题所在节点的 key（画布身份标识）；数据表格列问题时是所属表格节点的 key */
  nodeKey?: string
  /** 问题所在的数据表格列下标（问题发生在列元素内时才有值） */
  columnIndex?: number
  /** 文案参数，UI 层用 i18n 插值拼接（字段名 / 数量 / 表达式键名等） */
  params?: Record<string, string | number>
}

/** select / radio / checkbox / cascader / treeSelect / transfer 等选择类字段的实际
 *  注册 type（见 src/elements/definitions/fields.ts；cascader/treeSelect/transfer
 *  在本仓库注册为 naiveCascader/naiveTreeSelect/naiveTransfer 前缀形式）。 */
const OPTION_BASED_TYPES = new Set([
  'select',
  'radio',
  'checkbox',
  'naiveCascader',
  'naiveTreeSelect',
  'naiveTransfer',
])

function nodeKeyOf(node: FormNode): string {
  return node.key ?? node.id
}

function childrenOf(node: FormNode): FormNode[] {
  if (node.category === 'container' || node.category === 'layout') {
    const children = (node as ContainerNode & { children?: FormNode[] }).children
    return Array.isArray(children) ? children : []
  }
  return []
}

interface ColumnLike {
  element?: FieldNode
  [key: string]: unknown
}

function columnsOf(node: FormNode): ColumnLike[] {
  const cols = (node as { props?: Record<string, unknown> }).props?.columns
  return Array.isArray(cols) ? (cols as ColumnLike[]) : []
}

function hasStaticOptions(node: FieldNode): boolean {
  const options = node.options
  if (Array.isArray(options)) return options.length > 0
  // 动态字典来源：{ dynamic: true, code, label? }，不算"没有选项"
  return !!(options && typeof options === 'object' && (options as { dynamic?: boolean }).dynamic)
}

interface NameEntry {
  nodeKey: string
  columnIndex?: number
  name: string
}

/** 按数据作用域分组的字段名列表：主作用域一个桶，每个 array 容器（list/repeater）
 *  一个独立桶，每个数据表格的列各自一个独立桶（行数据作用域，与主表单数据无关）。
 *  作用域划分拿不准的地方（如 object 容器是否应该另起嵌套作用域）按全表检查处理，
 *  见任务规格 H2 的说明。 */
function collectScopedNames(definition: FormDefinition): Map<string, NameEntry[]> {
  const scopes = new Map<string, NameEntry[]>()
  const push = (scopeId: string, entry: NameEntry) => {
    const list = scopes.get(scopeId)
    if (list) list.push(entry)
    else scopes.set(scopeId, [entry])
  }

  const visit = (nodes: FormNode[], scopeId: string) => {
    for (const node of nodes) {
      if (!node) continue
      const key = nodeKeyOf(node)
      if (node.category === 'field' && node.name) push(scopeId, { nodeKey: key, name: node.name })

      const cols = columnsOf(node)
      if (cols.length) {
        const tableScope = `table:${key}`
        cols.forEach((col, columnIndex) => {
          if (col.element?.name)
            push(tableScope, { nodeKey: key, columnIndex, name: col.element.name })
        })
      }

      const children = childrenOf(node)
      if (children.length) {
        const isList = node.category === 'container' && (node as ContainerNode).dataType === 'array'
        visit(children, isList ? `list:${key}` : scopeId)
      }
    }
  }

  visit(definition?.root?.children ?? [], 'root')
  return scopes
}

/** 定义里出现过的所有字段名（不分作用域，供"引用了不存在的字段"检查兜底用——
 *  宁可漏报跨作用域误引用，也不要因为作用域判断有误而把正常引用错报成悬空引用）。 */
function collectAllFieldNames(definition: FormDefinition): Set<string> {
  const names = new Set<string>()
  const visit = (nodes: FormNode[]) => {
    for (const node of nodes) {
      if (!node) continue
      if (node.category === 'field' && node.name) names.add(node.name)
      for (const col of columnsOf(node)) {
        if (col.element?.name) names.add(col.element.name)
      }
      visit(childrenOf(node))
    }
  }
  visit(definition?.root?.children ?? [])
  return names
}

function exprKeyValue(node: FormNode, key: NodeExprKey): Expr | undefined {
  return (node as unknown as Record<string, Expr | undefined>)[key]
}

/** 表单体检：一次遍历产出全部问题（重复名 / 悬空引用 / 无法解析 / 缺选项 / 缺标签），
 *  纯函数，不读 i18n / 外部状态，供 IssuesPanel.vue 的 computed 直接调用。 */
export function lintDefinition(definition: FormDefinition): Issue[] {
  const issues: Issue[] = []
  if (!definition?.root) return issues

  // 1) 字段名重复（按作用域分组，见 collectScopedNames 注释）
  for (const entries of collectScopedNames(definition).values()) {
    const byName = new Map<string, NameEntry[]>()
    for (const entry of entries) {
      const list = byName.get(entry.name)
      if (list) list.push(entry)
      else byName.set(entry.name, [entry])
    }
    for (const [name, list] of byName) {
      if (list.length < 2) continue
      for (const entry of list) {
        issues.push({
          severity: 'error',
          code: 'duplicate-name',
          nodeKey: entry.nodeKey,
          columnIndex: entry.columnIndex,
          params: { name, count: list.length },
        })
      }
    }
  }

  // 2) 表达式 / 条件引用了不存在的字段（含 confirm 类校验规则）
  const allNames = collectAllFieldNames(definition)
  for (const ref of collectFieldRefs(definition)) {
    if (allNames.has(ref.fieldName)) continue
    if (ref.location.kind === 'validation') {
      issues.push({
        severity: 'error',
        code: 'confirm-unknown-field',
        nodeKey: ref.nodeKey,
        columnIndex: ref.columnIndex,
        params: { field: ref.fieldName, rule: ref.location.rule },
      })
    } else {
      issues.push({
        severity: 'error',
        code: 'unknown-field-ref',
        nodeKey: ref.nodeKey,
        columnIndex: ref.columnIndex,
        params: {
          field: ref.fieldName,
          key: ref.location.kind === 'expr-key' ? ref.location.exprKey : 'expr',
        },
      })
    }
  }

  // 3) 表达式 / 条件无法按内置语法解析 + 4) 选择类字段没有选项 + 6) 字段没有标签
  const visitNode = (node: FormNode, table?: { key: string; index: number }) => {
    const key = nodeKeyOf(node)
    for (const exprKey of NODE_EXPR_KEYS) {
      const expr = exprKeyValue(node, exprKey)
      if (expr && isUnparsedExpr(expr)) {
        issues.push({
          severity: 'warning',
          code: 'unparsed-expr',
          nodeKey: table?.key ?? key,
          columnIndex: table?.index,
          params: { key: exprKey },
        })
      }
    }
    if (node.category === 'field') {
      const field = node as FieldNode
      if (typeof field.expr === 'string' && field.expr.trim()) {
        if (isUnparsedExpr(parseExprString(field.expr))) {
          issues.push({
            severity: 'warning',
            code: 'unparsed-expr',
            nodeKey: table?.key ?? key,
            columnIndex: table?.index,
            params: { key: 'expr' },
          })
        }
      }
      if (OPTION_BASED_TYPES.has(field.type) && !hasStaticOptions(field)) {
        issues.push({
          severity: 'warning',
          code: 'missing-options',
          nodeKey: table?.key ?? key,
          columnIndex: table?.index,
        })
      }
      if (!field.label || !field.label.trim()) {
        issues.push({
          severity: 'info',
          code: 'missing-label',
          nodeKey: table?.key ?? key,
          columnIndex: table?.index,
        })
      }
    }

    const cols = columnsOf(node)
    cols.forEach((col, index) => {
      if (col.element) visitNode(col.element as unknown as FormNode, { key, index })
    })
    for (const child of childrenOf(node)) visitNode(child, table)
  }
  for (const child of definition.root.children ?? []) visitNode(child)

  return issues
}
