// ═══ 表单体检（H2）═══════════════════════════════════════════════════════════════
import { describe, expect, it } from 'vitest'
import { lintDefinition } from '@/dsl/lint'
import { parseExprString } from '@/dsl'
import type { ContainerNode, FieldNode, FormDefinition } from '@/types/dsl'

function field(id: string, extra: Partial<FieldNode> = {}): FieldNode {
  return {
    id,
    key: id,
    category: 'field',
    type: 'text',
    renderAs: 'formkit',
    name: id,
    label: '标签',
    ...extra,
  } as FieldNode
}

function buildDef(children: FormDefinition['root']['children']): FormDefinition {
  return {
    version: 1,
    id: 'f',
    name: 'f',
    root: {
      id: 'root',
      key: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children,
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function codesOf(issues: ReturnType<typeof lintDefinition>) {
  return issues.map((i) => i.code)
}

describe('lintDefinition', () => {
  it('干净的表单没有问题', () => {
    expect(lintDefinition(buildDef([field('a')]))).toEqual([])
  })

  it('字段名重复：同一作用域内报 error，每个重名节点各一条', () => {
    const issues = lintDefinition(buildDef([field('a'), { ...field('b'), name: 'a' }]))
    const dup = issues.filter((i) => i.code === 'duplicate-name')
    expect(dup).toHaveLength(2)
    expect(dup.every((i) => i.severity === 'error')).toBe(true)
    expect(dup.map((i) => i.nodeKey).sort()).toEqual(['a', 'b'])
  })

  it('列表（array 容器）内部是独立作用域，与根层同名字段不冲突', () => {
    const list: ContainerNode = {
      id: 'list',
      key: 'list',
      category: 'container',
      type: 'list',
      renderAs: 'formkit',
      dataType: 'array',
      children: [field('a')],
    }
    const issues = lintDefinition(buildDef([field('a'), list]))
    expect(issues.filter((i) => i.code === 'duplicate-name')).toHaveLength(0)
  })

  it('数据表格列各自的作用域内重复才报错，与根层字段互不影响', () => {
    const table: ContainerNode = {
      id: 'tbl',
      key: 'tbl',
      category: 'container',
      type: 'dataTable',
      renderAs: 'cmp',
      dataType: 'object',
      children: [],
      props: {
        columns: [
          { key: 'a', title: 'A', element: field('a') },
          { key: 'a2', title: 'A2', element: { ...field('a2'), name: 'a' } },
        ],
      },
    } as unknown as ContainerNode
    const issues = lintDefinition(buildDef([field('a'), table]))
    const dup = issues.filter((i) => i.code === 'duplicate-name')
    expect(dup).toHaveLength(2)
    expect(dup.every((i) => i.nodeKey === 'tbl')).toBe(true)
    expect(dup.map((i) => i.columnIndex).sort()).toEqual([0, 1])
  })

  it('条件渲染引用了不存在的字段：error', () => {
    const issues = lintDefinition(
      buildDef([field('a', { visibleIf: parseExprString('$missing == 1') })]),
    )
    expect(codesOf(issues)).toContain('unknown-field-ref')
    const issue = issues.find((i) => i.code === 'unknown-field-ref')!
    expect(issue.severity).toBe('error')
    expect(issue.params).toMatchObject({ field: 'missing' })
  })

  it('confirm 规则指向不存在的字段：error', () => {
    const issues = lintDefinition(
      buildDef([field('a', { validation: [{ rule: 'confirm', args: ['missing'] }] })]),
    )
    expect(codesOf(issues)).toContain('confirm-unknown-field')
    expect(issues.find((i) => i.code === 'confirm-unknown-field')?.severity).toBe('error')
  })

  it('表达式无法按内置语法解析：warning', () => {
    const issues = lintDefinition(buildDef([field('a', { expr: '$a +' })]))
    expect(codesOf(issues)).toContain('unparsed-expr')
    expect(issues.find((i) => i.code === 'unparsed-expr')?.severity).toBe('warning')
  })

  it('选择类字段没有静态选项且不是动态字典：warning', () => {
    const noOptions = lintDefinition(buildDef([field('a', { type: 'select' })]))
    expect(codesOf(noOptions)).toContain('missing-options')

    const withOptions = lintDefinition(
      buildDef([field('a', { type: 'select', options: [{ label: 'A', value: 'a' }] })]),
    )
    expect(codesOf(withOptions)).not.toContain('missing-options')

    const dynamic = lintDefinition(
      buildDef([
        field('a', {
          type: 'select',
          options: { dynamic: true, code: 'dict' } as unknown as FieldNode['options'],
        }),
      ]),
    )
    expect(codesOf(dynamic)).not.toContain('missing-options')
  })

  it('字段没有标签：info', () => {
    const issues = lintDefinition(buildDef([field('a', { label: undefined })]))
    expect(codesOf(issues)).toContain('missing-label')
    expect(issues.find((i) => i.code === 'missing-label')?.severity).toBe('info')
  })
})
