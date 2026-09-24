// 数据表格（n-data-table）画布 / 预览共用的列与数据归一化工具。
import { compileExpr } from '@/expression/evaluator'
import { evalExpr, schemaNodeToDslNode } from '@/dsl'
import type { FieldNode } from '@/types/dsl'
import type { DataTableColumn, DataTableConfig } from './types'
import type { SchemaNode } from '@/utils/schema/types'

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
type ColumnCellKind = 'switch' | 'rate' | 'color' | 'tag' | 'text'

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
export function columnsFromChildren(children: SchemaNode[]): DataTableColumn[] {
  if (!Array.isArray(children)) return []
  return children.map((c) => {
    const key = c.name ?? c.props?.name ?? c.id
    const title = c.label || c.props?.label || key
    let element: FieldNode | undefined
    if (c && typeof c === 'object') {
      // category 不在 SchemaNode 的已知键里（那是 DSL FieldNode 的字段，不是 schema
      // 节点的字段）；两种输入形态在这里合流（见函数头注释），按需要探测一次
      if ((c as unknown as FieldNode).category === 'field') {
        element = c as unknown as FieldNode
      } else if (
        typeof c.$formkit === 'string' ||
        typeof c.$cmp === 'string' ||
        typeof c.$el === 'string'
      ) {
        const node = schemaNodeToDslNode(c)
        if (node && node.category === 'field') element = node as FieldNode
      }
    }
    return { key: key as string, title: title as string, element }
  })
}

/** 示例数据的值形态分类：按列来源元素类型（或 render 字符串兜底）归类，
 *  与 columnKind 分开维护——两者服务的场景不同（columnKind 供只读渲染判断展示形态，
 *  这里要覆盖到日期/邮箱/链接/电话等更细的文本格式）。类型名以 src/elements 注册表
 *  里的实际 type 为准（naiveSwitch/naiveRate/naiveDateTime/naiveCascader/naiveTreeSelect）。 */
type SampleValueKind =
  | 'switch'
  | 'rate'
  | 'color'
  | 'options'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'email'
  | 'url'
  | 'phone'
  | 'text'

function sampleValueKind(type: string): SampleValueKind {
  if (/switch/i.test(type)) return 'switch'
  if (/rate/i.test(type)) return 'rate'
  if (/^color$/i.test(type)) return 'color'
  if (/(select|radio|checkbox|cascader|tree)/i.test(type)) return 'options'
  if (/dateTime/i.test(type)) return 'datetime'
  if (/^date$/i.test(type)) return 'date'
  if (/^time$/i.test(type)) return 'time'
  if (/(number|range)/i.test(type)) return 'number'
  if (/email/i.test(type)) return 'email'
  if (/^url$/i.test(type)) return 'url'
  if (/^tel$/i.test(type)) return 'phone'
  return 'text'
}

// select/radio/checkbox/cascader/tree 的示例文案：有 options 取第 i 项 label（或字符串
// 本身），否则回退到 A/B/C。这里不接 i18n（函数需要保持纯——不依赖 t()），中文的
// “选项 A/B/C”会引入语言分支，直接用字母序列即可，不影响示例数据的展示意图。
function sampleOptionLabel(element: FieldNode | undefined, i: number): string {
  const options = (element as unknown as { options?: unknown[] })?.options
  if (Array.isArray(options) && options.length) {
    const item = options[i % options.length]
    if (typeof item === 'string') return item
    if (item && typeof item === 'object' && typeof (item as any).label === 'string') {
      return (item as any).label
    }
  }
  return ['A', 'B', 'C'][i % 3]!
}

const SAMPLE_DATES = ['2026-01-01', '2026-01-02', '2026-01-03']
const SAMPLE_TIMES = ['09:30', '14:00', '18:45']
const SAMPLE_NUMBERS = [128, 64, 256]
const SAMPLE_COLORS = ['#a277ff', '#22c55e', '#f59e0b']
const SAMPLE_RATES = [3, 4, 5]

function sampleValue(col: DataTableColumn, i: number): unknown {
  const type = col.element?.type ?? col.render ?? ''
  switch (sampleValueKind(type)) {
    case 'switch':
      return i % 2 === 0
    case 'rate':
      return SAMPLE_RATES[i % SAMPLE_RATES.length]
    case 'color':
      return SAMPLE_COLORS[i % SAMPLE_COLORS.length]
    case 'options':
      return sampleOptionLabel(col.element, i)
    case 'number':
      return SAMPLE_NUMBERS[i % SAMPLE_NUMBERS.length]
    case 'date':
      return SAMPLE_DATES[i % SAMPLE_DATES.length]
    case 'time':
      return SAMPLE_TIMES[i % SAMPLE_TIMES.length]
    case 'datetime':
      return `${SAMPLE_DATES[i % SAMPLE_DATES.length]} ${SAMPLE_TIMES[i % SAMPLE_TIMES.length]}`
    case 'email':
      return `user${i + 1}@example.com`
    case 'url':
      return `https://example.com/${i + 1}`
    case 'phone':
      return `138 0000 000${i + 1}`
    default:
      return `${col.title} ${i + 1}`
  }
}

/** 画布占位示例数据：无真实数据（或远程模式）时按列类型生成 count 行展示用数据，
 *  纯函数（不读 i18n / 外部状态），供 DataTableContainer 只读渲染使用 */
export function buildSampleRows(columns: DataTableColumn[], count = 3): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    const row: Record<string, unknown> = {}
    for (const col of columns) {
      if (!col.key) continue
      row[col.key] = sampleValue(col, i)
    }
    rows.push(row)
  }
  return rows
}

/** 归一化远程数据返回：支持数组 / { data, total } / { items, total } / { list, count } */
export function normalizeRemoteResult(res: unknown): {
  rows: Record<string, unknown>[]
  total: number
} {
  const data = res as {
    pageData?: Record<string, unknown>[]
    total?: number
  }

  const rows = Array.isArray(data?.pageData) ? data.pageData : []
  const total = Number(data?.total) || rows.length

  return {
    rows,
    total,
  }
}
