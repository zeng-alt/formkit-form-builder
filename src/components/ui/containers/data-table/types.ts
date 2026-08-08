// 数据表格元素（n-data-table 容器）的列 / 配置数据结构，纯数据，不含任何 .vue。
// 分区契约：
//   - 搜索区 = 容器 children（FieldNode 列表，引擎/DnD/reconcile 均以 children 为唯一承载，
//     避免字段节点同时在 props 与 children 造成双归属重复解析）；
//   - 列区 = props.columns（纯列定义，引擎不递归 props，无循环解析风险）。

import type { FieldNode } from '@/types/dsl'

export interface DataTableColumn {
  /** 数据字段名（读 data 行的该字段作为单元格内容） */
  key: string
  /** 表头文案 */
  title: string
  /** 列宽（px） */
  width?: number
  align?: 'left' | 'center' | 'right'
  /** 过长内容省略 */
  ellipsis?: boolean
  sortable?: boolean
  /** 单元格渲染：引用字段类型（text/select/switch…）或展示类型，缺省按纯文本 */
  render?: string
  /** 单元格渲染的额外配置（按 render 类型透传，忽略 value/validation 等表单语义） */
  renderProps?: Record<string, unknown>
  /** 新增数据弹窗中的栅格占用列数（1-12，缺省整行） */
  colspan?: number
  /** 来源字段元素：新增列时选择的字段元素 DSL 节点（FieldNode），保留原元素信息（编辑面板展示/复用） */
  element?: FieldNode
}

/** dataTable 元素的配置项（存放在节点 props，DSL / JSON-safe） */
export interface DataTableConfig {
  /** 固定数据（前端分页时由 n-data-table 本地分页） */
  data?: Record<string, unknown>[]
  /** 主键字段名，用于选中行 / 行 key */
  rowKey?: string
  /** 是否显示边框 */
  bordered?: boolean
  /** 表格尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 固定列总宽（横向滚动阈值，px） */
  scrollX?: number
  /** 是否启用分页 */
  pagination?: boolean
  /** 每页条数 */
  pageSize?: number
  /** 远程分页模式：true 时按页执行 props.getData 里的 JS 代码拉取数据 */
  remote?: boolean
  /** 远程获取数据的 JS 代码（runBindCode 执行，参数：page · pageSize · form · axios） */
  getData?: string
  /** 远程新增数据的 JS 代码（runBindCode 执行，参数：row 新增行 · form · axios） */
  createData?: string
  /** 远程编辑数据的 JS 代码（runBindCode 执行，参数：row 编辑行 · form · axios） */
  updateData?: string
  /** 远程删除数据的 JS 代码（runBindCode 执行，参数：row 待删行 · form · axios） */
  deleteData?: string
  /** 固定数据模式：是否允许新增（直接操作 data，无需远程代码） */
  allowAdd?: boolean
  /** 固定数据模式：是否允许编辑（直接操作 data，无需远程代码） */
  allowEdit?: boolean
  /** 固定数据模式：是否允许删除（直接操作 data，无需远程代码） */
  allowDelete?: boolean
}
