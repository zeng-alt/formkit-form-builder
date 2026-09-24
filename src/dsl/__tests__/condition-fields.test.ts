// ═══ G：条件必填 / 条件禁用 / 条件只读——DSL ⇄ schema 往返 ═══════════════════════
// 覆盖 requiredIf / disabledIf / readonlyIf 三个键，$cmp（字段实际渲染原语）与
// $formkit（renderAs:'formkit' 的写法，事件测试 events.test.ts 同款用法）各一例。
import { describe, it, expect } from 'vitest'
import { fieldNodeToSchema } from '@/dsl/convert'
import { fieldNodeFromSchema } from '@/dsl/convert/field'
import { parseExprString } from '@/dsl'
import type { Expr, FieldNode } from '@/types/dsl'

const flagIsYes: Expr = {
  type: 'call',
  fn: 'eq',
  args: [
    { type: 'field', name: 'flag' },
    { type: 'literal', value: 'yes' },
  ],
}

describe('requiredIf / disabledIf / readonlyIf：DSL → schema', () => {
  it('$cmp 字段：编译为 { if, then } 条件属性，落在 props 上', () => {
    const node: FieldNode = {
      id: 'n1',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f1',
      requiredIf: flagIsYes,
      disabledIf: flagIsYes,
      readonlyIf: flagIsYes,
    }
    const schema: any = fieldNodeToSchema(node, { renderAs: 'cmp' })
    // requiredIf 编译进 validation 的条件属性：then 含 required，else 不含
    // （object 字面量直接写 then/else 会被 no-thenable 误判，这里改用属性读取断言）
    const v = schema.props.validation
    expect(v.then).toEqual([['required']])
    expect(v.else).toEqual([])
    expect(typeof v.if).toBe('string')
    // disabledIf / readonlyIf 各自一个 { if, then: true } 的条件属性，省略 else
    expect(schema.props.__disabledIf.then).toBe(true)
    expect(schema.props.__readonlyIf.then).toBe(true)
    expect('else' in schema.props.__disabledIf).toBe(false)
  })

  it('$formkit 字段：三个键落在 schema 顶层（与 cmp 落 props 相对）', () => {
    const node: FieldNode = {
      id: 'n2',
      category: 'field',
      type: 'customFormkit',
      renderAs: 'formkit',
      name: 'f2',
      requiredIf: flagIsYes,
      disabledIf: flagIsYes,
      readonlyIf: flagIsYes,
    }
    const schema: any = fieldNodeToSchema(node, { renderAs: 'formkit' })
    expect(schema.validation.then).toEqual([['required']])
    expect(schema.validation.else).toEqual([])
    expect(schema.__disabledIf.then).toBe(true)
    expect(schema.__readonlyIf.then).toBe(true)
  })

  it('静态已有 required 时：then/else 都含 required（条件真假都不影响结果）', () => {
    const node: FieldNode = {
      id: 'n3',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f3',
      validation: [{ rule: 'required' }],
      requiredIf: flagIsYes,
    }
    const schema: any = fieldNodeToSchema(node, { renderAs: 'cmp' })
    expect(schema.props.validation.then).toEqual([['required']])
    expect(schema.props.validation.else).toEqual([['required']])
  })

  it('未设置条件键时不产出对应的 schema 键', () => {
    const node: FieldNode = {
      id: 'n4',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f4',
    }
    const schema: any = fieldNodeToSchema(node, { renderAs: 'cmp' })
    expect(Array.isArray(schema.props?.validation ?? [])).toBe(true)
    expect(schema.props?.__disabledIf).toBeUndefined()
    expect(schema.props?.__readonlyIf).toBeUndefined()
  })
})

describe('requiredIf / disabledIf / readonlyIf：schema → DSL（往返无损）', () => {
  it('$cmp 字段：往返还原出等价的 Expr AST', () => {
    const node: FieldNode = {
      id: 'n5',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f5',
      requiredIf: flagIsYes,
      disabledIf: flagIsYes,
      readonlyIf: flagIsYes,
    }
    const schema = fieldNodeToSchema(node, { renderAs: 'cmp' })
    const back = fieldNodeFromSchema(schema)
    expect(back.requiredIf).toEqual(flagIsYes)
    expect(back.disabledIf).toEqual(flagIsYes)
    expect(back.readonlyIf).toEqual(flagIsYes)
  })

  it('$formkit 字段：往返还原出等价的 Expr AST', () => {
    const node: FieldNode = {
      id: 'n6',
      category: 'field',
      type: 'customFormkit',
      renderAs: 'formkit',
      name: 'f6',
      requiredIf: flagIsYes,
      disabledIf: flagIsYes,
      readonlyIf: flagIsYes,
    }
    const schema = fieldNodeToSchema(node, { renderAs: 'formkit' })
    const back = fieldNodeFromSchema(schema)
    expect(back.requiredIf).toEqual(flagIsYes)
    expect(back.disabledIf).toEqual(flagIsYes)
    expect(back.readonlyIf).toEqual(flagIsYes)
  })

  it('requiredIf 与静态 required 同时存在：往返都保留（DSL 层不丢失，运行时侧优先级见 field.ts 注释）', () => {
    const node: FieldNode = {
      id: 'n7',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f7',
      validation: [{ rule: 'required' }, { rule: 'length', args: [2, 10] }],
      requiredIf: flagIsYes,
    }
    const schema = fieldNodeToSchema(node, { renderAs: 'cmp' })
    const back = fieldNodeFromSchema(schema)
    expect(back.requiredIf).toEqual(flagIsYes)
    expect(back.validation).toEqual(
      expect.arrayContaining([{ rule: 'required' }, { rule: 'length', args: [2, 10] }]),
    )
  })

  it('用户可读表达式经 IfConditionEditor 的写法（parseExprString）同样往返无损', () => {
    const expr = parseExprString('$other == "yes" && $age >= 18')
    const node: FieldNode = {
      id: 'n8',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f8',
      disabledIf: expr,
    }
    const schema = fieldNodeToSchema(node, { renderAs: 'cmp' })
    const back = fieldNodeFromSchema(schema)
    expect(back.disabledIf).toEqual(expr)
  })
})
