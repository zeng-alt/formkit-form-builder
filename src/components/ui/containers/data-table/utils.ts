// 数据表格（n-data-table）画布 / 预览共用的列与数据归一化工具。
import { compileExpr } from '@/expression/evaluator'
import { evalExpr, schemaNodeToDslNode } from '@/dsl'
import type { FieldNode } from '@/types/dsl'
import type { DataTableColumn, DataTableConfig } from './types'

/** 画布缺失时兜底样本列 + 数据，保证拖入即有可看效果 */
export const CANVAS_SAMPLE_COLUMNS: DataTableColumn[] = [
  { key: 'name', title: '姓名', width: 140 },
  { key: 'role', title: '角色', width: 120 },
  { key: 'status', title: '状态', width: 90 },
]

export const CANVAS_SAMPLE_DATA = [
  { name: '张三', role: '管理员', status: '正常' },
  { name: '李四', role: '编辑', status: '停用' },
  { name: '王五', role: '访客', status: '正常' },
]

export function toColumns(cfg: DataTableConfig): DataTableColumn[] {
  const columns = (cfg as any).columns as DataTableColumn[] | undefined
  return Array.isArray(columns) ? columns : []
}

export function toData(cfg: DataTableConfig): Record<string, unknown>[] {
  return Array.isArray(cfg.data) ? cfg.data : []
}

export function toRowKey(cfg: DataTableConfig, fallback: string): string {
  return typeof cfg.rowKey === 'string' && cfg.rowKey ? cfg.rowKey : fallback
}

export function toPageSize(cfg: DataTableConfig, fallback: number): number {
  const n = Number(cfg.pageSize)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** 新增数据弹窗栅格占用列数：缺省 / 非法值整行（12），越界收敛到 1-12 */
export function toColspan(col: Pick<DataTableColumn, 'colspan'> | undefined): number {
  const n = Number(col?.colspan)
  if (!Number.isFinite(n) || n <= 0) return 12
  return Math.max(1, Math.min(12, Math.round(n)))
}

/** 表达式驱动的列值：列元素带 expr 时按当前行数据求值，值不可手输（只读派生）。
 *  依赖字段经 evalExpr 读取行数据，在 computed 中调用时由 Vue 响应式跟踪。
 *  求值失败（表达式非法）时回落为原始值，仍按派生处理避免手输被覆盖。 */
export function evaluateColumnExpr(
  element: FieldNode | undefined,
  row: Record<string, unknown>,
  fallback: unknown,
): { value: unknown; derived: boolean } {
  if (element && typeof element.expr === 'string' && element.expr.trim()) {
    try {
      return { value: compileExpr(element.expr).evaluate(row), derived: true }
    } catch {
      return { value: fallback, derived: true }
    }
  }
  return { value: fallback, derived: false }
}

/** 条件渲染：列元素带 visibleIf 时按当前行数据求值，为假则隐藏该列输入；无条件恒显示 */
export function isColumnVisible(
  element: FieldNode | undefined,
  row: Record<string, unknown>,
): boolean {
  if (!element?.visibleIf) return true
  const result = evalExpr(element.visibleIf, row)
  return result.ok ? Boolean(result.value) : true
}

/** 列渲染形态：按 render 类型归类，供画布 / 预览只读渲染与占位数据生成使用 */
export type ColumnCellKind = 'switch' | 'rate' | 'color' | 'tag' | 'text'

export function columnKind(render?: string): ColumnCellKind {
  const t = render ?? ''
  if (/switch/i.test(t)) return 'switch'
  if (/rate/i.test(t)) return 'rate'
  if (/color/i.test(t)) return 'color'
  if (/(select|radio|checkbox|cascader|tree)/i.test(t)) return 'tag'
  return 'text'
}

/** 由 schema 字段节点派生 { key, title, element }：搜索区（children）按来源元素渲染原控件。
 *  引擎渲染后传入的 children 是已转换的 FormKit schema 节点（$formkit/$cmp/$el），
 *  经 schemaNodeToDslNode 回转为 DSL FieldNode；本身已是 DSL 节点则直接复用。 */
export function columnsFromChildren(children: Array<Record<string, unknown>>): DataTableColumn[] {
  if (!Array.isArray(children)) return []
  return children.map((c) => {
    const anyC = c as any
    const key =
      (anyC.name as string | undefined) ??
      (anyC.props?.name as string | undefined) ??
      (anyC.id as string)
    const title =
      (anyC.label as string | undefined) ||
      (anyC.props?.label as string | undefined) ||
      (key as string)
    let element: FieldNode | undefined
    if (anyC && typeof anyC === 'object') {
      if (anyC.category === 'field') {
        element = anyC as FieldNode
      } else if (
        typeof anyC.$formkit === 'string' ||
        typeof anyC.$cmp === 'string' ||
        typeof anyC.$el === 'string'
      ) {
        const node = schemaNodeToDslNode(anyC)
        if (node && node.category === 'field') element = node as FieldNode
      }
    }
    return { key: key as string, title: title as string, element }
  })
}

/** 归一化远程数据返回：支持数组 / { data, total } / { items, total } / { list, count } */
export function normalizeRemoteResult(res: unknown): {
  rows: Record<string, unknown>[]
  total: number
} {
  if (Array.isArray(res)) return { rows: res as Record<string, unknown>[], total: res.length }
  const any = (res ?? {}) as Record<string, unknown>
  const rows = Array.isArray(any?.data)
    ? (any.data as Record<string, unknown>[])
    : Array.isArray(any?.items)
      ? (any.items as Record<string, unknown>[])
      : Array.isArray(any?.list)
        ? (any.list as Record<string, unknown>[])
        : []
  const total = Number(any?.total ?? any?.itemCount ?? any?.count ?? rows.length) || rows.length
  return { rows, total }
}

/** 供画布展示：列缺失时用样本列，数据缺失时用样本数据 */
export function canvasColumns(cfg: DataTableConfig) {
  const cols = toColumns(cfg)
  return cols.length > 0 ? cols : CANVAS_SAMPLE_COLUMNS
}

export function canvasData(cfg: DataTableConfig) {
  const rows = toData(cfg)
  return rows.length > 0 ? rows : CANVAS_SAMPLE_DATA
}
