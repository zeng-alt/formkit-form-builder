// ═══ 字段引用收集 / 改名（H1）═══════════════════════════════════════════════════
import { describe, expect, it } from 'vitest'
import { collectFieldRefs, renameFieldRefs, NODE_EXPR_KEYS } from '@/dsl/refs'
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

describe('NODE_EXPR_KEYS', () => {
  it('包含条件渲染 + 任务 G 的三个条件键', () => {
    expect(NODE_EXPR_KEYS).toEqual(['visibleIf', 'requiredIf', 'disabledIf', 'readonlyIf'])
  })
})

describe('collectFieldRefs', () => {
  it('收集 visibleIf / requiredIf / disabledIf / readonlyIf（宽松类型读取，不依赖 FieldNode 类型定义）', () => {
    const b = field('b', {
      visibleIf: parseExprString('$a == 1'),
      ...({
        requiredIf: parseExprString('$a == 2'),
        disabledIf: parseExprString('$a == 3'),
        readonlyIf: parseExprString('$a == 4'),
      } as Partial<FieldNode>),
    })
    const def = buildDef([field('a'), b])
    const refs = collectFieldRefs(def)
    const keys = refs
      .filter((r) => r.location.kind === 'expr-key')
      .map((r) => (r.location as { exprKey: string }).exprKey)
    expect(new Set(keys)).toEqual(new Set(['visibleIf', 'requiredIf', 'disabledIf', 'readonlyIf']))
    expect(refs.every((r) => r.fieldName === 'a')).toBe(true)
  })

  it('收集 expr 字符串里的字段引用（解析成功时）', () => {
    const b = field('b', { expr: '$a * 2' })
    const refs = collectFieldRefs(buildDef([field('a'), b]))
    expect(refs).toContainEqual(
      expect.objectContaining({ nodeKey: 'b', fieldName: 'a', location: { kind: 'expr' } }),
    )
  })

  it('收集 confirm 校验规则的字段引用', () => {
    const b = field('b', { validation: [{ rule: 'confirm', args: ['a'] }] })
    const refs = collectFieldRefs(buildDef([field('a'), b]))
    expect(refs).toContainEqual(
      expect.objectContaining({
        nodeKey: 'b',
        fieldName: 'a',
        location: { kind: 'validation', rule: 'confirm' },
      }),
    )
  })

  it('收集数据表格列元素里的引用，标出所属表格 key 与列下标', () => {
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
          {
            key: 'c1',
            title: 'C1',
            element: field('c1', { visibleIf: parseExprString('$a == 1') }),
          },
        ],
      },
    } as unknown as ContainerNode
    const refs = collectFieldRefs(buildDef([field('a'), table]))
    expect(refs).toContainEqual(
      expect.objectContaining({
        fieldName: 'a',
        dataTableKey: 'tbl',
        columnIndex: 0,
        location: { kind: 'expr-key', exprKey: 'visibleIf' },
      }),
    )
  })
})

describe('renameFieldRefs', () => {
  it('改名同时更新 visibleIf（AST）与 expr 字符串（解析成功路径）', () => {
    const b = field('b', { visibleIf: parseExprString('$a == 1'), expr: '$a * 2' })
    const def = buildDef([field('a'), b])
    const { definition, count } = renameFieldRefs(def, 'a', 'a2')
    expect(count).toBe(2)
    const nextB = definition.root.children[1] as FieldNode
    expect(nextB.visibleIf).toEqual(parseExprString('$a2 == 1'))
    expect(nextB.expr).toBe('$a2 * 2')
    // 字段自己的 name 不受影响（改名的"声明"部分由调用方负责，这里只管引用）
    expect(nextB.name).toBe('b')
    // 不改动输入
    expect((def.root.children[1] as FieldNode).expr).toBe('$a * 2')
  })

  it('按词边界替换，不误伤 $name2', () => {
    const b = field('b', { expr: '$a + $a2' })
    const { definition, count } = renameFieldRefs(buildDef([field('a'), field('a2'), b]), 'a', 'x')
    expect(count).toBe(1)
    expect((definition.root.children[2] as FieldNode).expr).toBe('$x + $a2')
  })

  it('不误伤字符串字面量里凑巧同名的内容', () => {
    const b = field('b', { expr: '$a == "a"' })
    const { definition } = renameFieldRefs(buildDef([field('a'), b]), 'a', 'x')
    expect((definition.root.children[1] as FieldNode).expr).toBe('$x == "a"')
  })

  it('confirm 校验规则的参数一起改名', () => {
    const b = field('b', { validation: [{ rule: 'confirm', args: ['a'] }] })
    const { definition, count } = renameFieldRefs(buildDef([field('a'), b]), 'a', 'x')
    expect(count).toBe(1)
    expect((definition.root.children[1] as FieldNode).validation).toEqual([
      { rule: 'confirm', args: ['x'] },
    ])
  })

  it('expr 解析失败时退回安全的正则替换', () => {
    // 故意写一个解析不了的表达式（尾部悬空运算符）
    const b = field('b', { expr: '$a +' })
    expect(parseExprString(b.expr!).type).toBe('call') // __raw__ 兜底
    const { definition, count } = renameFieldRefs(buildDef([field('a'), b]), 'a', 'x')
    expect(count).toBe(1)
    expect((definition.root.children[1] as FieldNode).expr).toBe('$x +')
  })

  it('数据表格列元素里的引用一起改名', () => {
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
          {
            key: 'c1',
            title: 'C1',
            element: field('c1', { visibleIf: parseExprString('$a == 1') }),
          },
        ],
      },
    } as unknown as ContainerNode
    const { definition, count } = renameFieldRefs(buildDef([field('a'), table]), 'a', 'x')
    expect(count).toBe(1)
    const nextTable = definition.root.children[1] as unknown as {
      props: { columns: Array<{ element: FieldNode }> }
    }
    expect(nextTable.props.columns[0]!.element.visibleIf).toEqual(parseExprString('$x == 1'))
  })

  it('旧名不存在引用时原样返回（结构共享）', () => {
    const def = buildDef([field('a'), field('b')])
    const result = renameFieldRefs(def, 'a', 'a2')
    expect(result.count).toBe(0)
    expect(result.definition).toBe(def)
  })

  it('oldName/newName 相同或为空时原样返回', () => {
    const def = buildDef([field('a')])
    expect(renameFieldRefs(def, 'a', 'a').definition).toBe(def)
    expect(renameFieldRefs(def, '', 'a').definition).toBe(def)
  })
})
