// 数据表格列的创建 / 复制 / 图标解析：画布（DataTableContainer）与属性面板
// （DataTableEditor 的列列表）共用，保证两处新增的列结构一致。
import { getElementDefinition, getElementDefinitions } from '@/elements'
import { getElementTypeDef } from '@/dsl'
import type { FieldNode } from '@/types/dsl'
import type { DataTableColumn } from './types'

type Translate = (key: string, params?: Record<string, string | number>) => string

export interface FieldTypeOption {
  type: string
  label: string
  icon?: string
}

/** 可作为列 / 搜索条件的字段元素（目录中 category 为 field 的类型） */
export function fieldTypeOptions(t: Translate): FieldTypeOption[] {
  return getElementDefinitions()
    .filter((d) => d.category === 'field')
    .map((d) => ({ type: d.type, label: d.tooltipKey ? t(d.tooltipKey) : d.type, icon: d.icon }))
}

/** base、base_1、base_2… 中第一个不在 existing 里的 key */
export function uniqueColumnKey(base: string, existing: Iterable<string>): string {
  const used = new Set(existing)
  if (!used.has(base)) return base
  let n = 1
  while (used.has(`${base}_${n}`)) n++
  return `${base}_${n}`
}

/** 按字段类型新建一列：key = 类型名去重，title = 类型显示名；element 保存来源字段元素
 *  的 DSL 节点（name=key、label=title），供列编辑器的「元素属性」复用该类型的编辑器 */
export function createColumn(
  type: string,
  t: Translate,
  existingKeys: Iterable<string>,
): DataTableColumn {
  const def = getElementDefinition(type)
  const title = def?.tooltipKey ? t(def.tooltipKey) : type
  const key = uniqueColumnKey(type, existingKeys)
  const typeDef = getElementTypeDef(type)
  const element = typeDef
    ? ({ ...typeDef.defaults(), name: key, label: title } as FieldNode)
    : undefined
  return { key, title, render: type, element }
}

/** 复制一列：key 去重、title 追加副本后缀，element 深拷贝并同步 name/label */
export function duplicateColumn(
  col: DataTableColumn,
  existingKeys: Iterable<string>,
  titleSuffix: string,
): DataTableColumn {
  const key = uniqueColumnKey(`${col.key}_copy`, existingKeys)
  const title = `${col.title}${titleSuffix}`
  const copy = JSON.parse(JSON.stringify(col)) as DataTableColumn
  copy.key = key
  copy.title = title
  if (copy.element) copy.element = { ...copy.element, name: key, label: title }
  return copy
}

/** 列的类型图标：优先来源元素类型，其次 render */
export function columnIcon(col: Pick<DataTableColumn, 'render' | 'element'>): string | undefined {
  const type = col.element?.type ?? col.render
  return type ? getElementDefinition(type)?.icon : undefined
}
