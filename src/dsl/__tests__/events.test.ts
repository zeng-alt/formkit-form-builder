// ═══ 事件绑定：DSL events ⇄ schema __bind ══════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { eventsToBind, bindToEvents } from '@/dsl/events'
import { fieldNodeToSchema } from '@/dsl/convert'
import { normalizeBind } from '@/utils/bind-runtime'
import { dslToSchema, schemaToDsl, DSL_VERSION } from '@/dsl'
import type { FieldNode, FormDefinition } from '@/types/dsl'
import { schemaChildren } from '@/utils/schema/types'

describe('eventsToBind / bindToEvents', () => {
  it('双向转换：events → __bind → events（按 FORM_EVENTS 顺序输出）', () => {
    const events = [
      { event: 'click' as const, handler: 'a()' },
      { event: 'blur' as const, handler: 'b()' },
    ]
    const bind = eventsToBind(events)
    expect(bind).toEqual({ onClick: 'a()', onBlur: 'b()' })
    // click 排在 blur 之前（FORM_EVENTS 顺序），与输入顺序无关
    expect(bindToEvents(bind)).toEqual([
      { event: 'click', handler: 'a()' },
      { event: 'blur', handler: 'b()' },
    ])
  })

  it('eventsToBind：空 / 全空白输入返回 undefined', () => {
    expect(eventsToBind(undefined)).toBeUndefined()
    expect(eventsToBind([])).toBeUndefined()
    expect(eventsToBind([{ event: 'click', handler: '   ' }])).toBeUndefined()
  })

  it('bindToEvents：忽略非 FORM_EVENTS 的键，接受 __js 包装，跳过空白代码', () => {
    const result = bindToEvents({
      onClick: 'a()',
      onDblclick: 'ignored()',
      onBlur: { __js: 'b()' },
      onFocus: '   ',
      onChange: { __js: '   ' },
    })
    expect(result).toEqual([
      { event: 'click', handler: 'a()' },
      { event: 'blur', handler: 'b()' },
    ])
  })

  it('bindToEvents：非对象 / 空对象输入返回 undefined', () => {
    expect(bindToEvents(undefined)).toBeUndefined()
    expect(bindToEvents(null)).toBeUndefined()
    expect(bindToEvents('nope')).toBeUndefined()
    expect(bindToEvents({})).toBeUndefined()
  })
})

describe('normalizeBind（bind-runtime.ts，运行时放行集合）', () => {
  it('恰好放行 5 个事件键，忽略 onDblclick，展开 __js', () => {
    const result = normalizeBind({
      onClick: 'a',
      onDblclick: 'b',
      onBlur: { __js: 'c' },
    })
    expect(result).toEqual({ onClick: 'a', onBlur: 'c' })
  })
})

function buildFormDef(node: FieldNode): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'f',
    name: 'form',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [node],
    },
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
  }
}

describe('events → schema（三种 renderAs 落位）', () => {
  it('formkit 字段：__bind 落在顶层，不产出 onClick 字符串键', () => {
    const node: FieldNode = {
      id: 'n1',
      category: 'field',
      type: 'customFormkit',
      renderAs: 'formkit',
      name: 'f1',
      events: [{ event: 'click', handler: 'a()' }],
    }
    const schema: any = fieldNodeToSchema(node, { renderAs: 'formkit' })
    expect(schema.__bind).toEqual({ onClick: 'a()' })
    // onClick 只应出现在 __bind 内部，不应作为 schema 自身的顶层键单独产出
    expect(schema.onClick).toBeUndefined()
  })

  it('cmp 字段：__bind 落在 props，不产出 onChange 字符串键', () => {
    const node: FieldNode = {
      id: 'n2',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f2',
      events: [{ event: 'change', handler: 'b()' }],
    }
    const def = buildFormDef(node)
    const schema = dslToSchema(def)
    const fieldSchema = schemaChildren(schema[0])[0]!
    expect(fieldSchema.$cmp).toBe('text')
    expect(fieldSchema.props.__bind).toEqual({ onChange: 'b()' })
    expect(fieldSchema.__bind).toBeUndefined()
    // onChange 只应出现在 props.__bind 内部，props 上不应再有一份平铺的 onChange
    expect(fieldSchema.props.onChange).toBeUndefined()
    expect(fieldSchema.onChange).toBeUndefined()
  })

  it('el 字段：__bind 落在 attrs，不产出 onFocus 字符串键', () => {
    const node: FieldNode = {
      id: 'n3',
      category: 'field',
      type: 'customEl',
      renderAs: 'el',
      target: 'span',
      name: 'f3',
      events: [{ event: 'focus', handler: 'c()' }],
    }
    const schema: any = fieldNodeToSchema(node, { renderAs: 'el', target: 'span' })
    expect(schema.attrs?.__bind).toEqual({ onFocus: 'c()' })
    expect(schema.__bind).toBeUndefined()
    expect(schema.attrs.onFocus).toBeUndefined()
    expect(schema.onFocus).toBeUndefined()
  })
})

describe('schema → DSL：__bind 落位', () => {
  it('schema 带 __bind → schemaToDsl 后 events 正确，且 props 里没有 __bind', () => {
    const node: FieldNode = {
      id: 'n4',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f4',
      events: [
        { event: 'click', handler: 'a()' },
        { event: 'input', handler: 'i()' },
      ],
    }
    const def = buildFormDef(node)
    const schema = dslToSchema(def)
    const dsl2 = schemaToDsl(schema)
    const field2 = dsl2.root.children[0] as FieldNode
    expect(field2.events).toEqual([
      { event: 'click', handler: 'a()' },
      { event: 'input', handler: 'i()' },
    ])
    expect(field2.props?.__bind).toBeUndefined()
  })

  it('DSL 节点 props.__bind（非真源位置）不再参与合并，不出现在输出 __bind 里', () => {
    const node: FieldNode = {
      id: 'n5',
      category: 'field',
      type: 'text',
      renderAs: 'cmp',
      name: 'f5',
      events: [{ event: 'click', handler: 'c()' }],
      props: { __bind: { onBlur: 'b()' } },
    }
    const def = buildFormDef(node)
    const schema = dslToSchema(def)
    const fieldSchema = schemaChildren(schema[0])[0]!
    expect(fieldSchema.props.__bind).toEqual({ onClick: 'c()' })
    expect(Object.keys(fieldSchema.props)).not.toContain('onBlur')
    expect(Object.keys(fieldSchema.props)).not.toContain('onClick')
  })
})
