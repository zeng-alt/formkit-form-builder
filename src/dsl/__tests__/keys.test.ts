import { describe, expect, it } from 'vitest'
import { DSL_VERSION, toPortableDefinition } from '@/dsl'
import { ensureDslKeys } from '@/dsl/keys'
import { createFormBuilderState } from '@/state/create-form-builder-state'
import type { FormDefinition, FormNode } from '@/types/dsl'

function field(id: string, key?: string): FormNode {
  return { id, key, category: 'field', type: 'text', renderAs: 'formkit', name: id } as FormNode
}

function buildDef(): FormDefinition {
  return {
    version: DSL_VERSION,
    id: 'f',
    name: 'f',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [
        field('a', 'a'),
        {
          id: 'g',
          key: 'g',
          category: 'container',
          type: 'group',
          renderAs: 'formkit',
          dataType: 'object',
          children: [field('b', 'b'), field('c', 'c')],
        } as FormNode,
      ],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

function allKeys(nodes: FormNode[], out: (string | undefined)[] = []) {
  for (const n of nodes) {
    out.push(n.key)
    const children = (n as { children?: FormNode[] }).children
    if (Array.isArray(children)) allKeys(children, out)
  }
  return out
}

describe('ensureDslKeys', () => {
  it('所有节点已有 key 时原样返回同一对象', () => {
    const def = buildDef()
    expect(ensureDslKeys(def)).toBe(def)
  })

  it('toPortableDefinition 剥离 key 后，补齐的 key 复用节点 id（确定、可重复）', () => {
    const portable = toPortableDefinition(buildDef())
    const filled = ensureDslKeys(portable)
    expect(allKeys(filled.root.children)).toEqual(['a', 'g', 'b', 'c'])
    // 不改动输入
    expect(allKeys(portable.root.children)).toEqual([undefined, undefined, undefined, undefined])
  })

  it('只重建缺 key 节点到根的路径，其余子树复用原引用', () => {
    const def = buildDef()
    const group = def.root.children[1] as FormNode & { children: FormNode[] }
    delete (group.children[1] as { key?: string }).key
    const filled = ensureDslKeys(def)
    const nextGroup = filled.root.children[1] as FormNode & { children: FormNode[] }
    expect(filled.root.children[0]).toBe(def.root.children[0])
    expect(nextGroup.children[0]).toBe(group.children[0])
    expect(nextGroup.children[1]!.key).toBe('c')
  })

  it('id 已被占用为 key 或重复时生成唯一随机 key', () => {
    const def = buildDef()
    def.root.children.push(field('a'), field('dup'), field('dup'))
    const keys = allKeys(ensureDslKeys(def).root.children)
    expect(keys.every(Boolean)).toBe(true)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toContain('dup')
  })

  it('设计器载入无 key 定义后，容器子节点投影出 __key，可按 key 选中', () => {
    const state = createFormBuilderState()
    state.setFormDefinition(toPortableDefinition(buildDef()), { resetHistory: true })
    const group = state.formSchema.value[1] as { children: { __key?: string }[] }
    expect(group.children.map((c) => c.__key)).toEqual(['b', 'c'])
  })

  // H2：外部手写/生成的定义可能整个漏掉 settings（类型上必填，运行时不保证）；
  // schema-adapter 的 buildSchema 直接读 settings.labelAlign，缺失时会抛错。
  it('settings 缺失时补齐默认值', () => {
    const def = buildDef()
    // 模拟外部生成/手写的非法定义：整个漏掉 settings 字段
    const withoutSettings = { ...def } as Partial<FormDefinition> as FormDefinition
    delete (withoutSettings as { settings?: unknown }).settings
    const filled = ensureDslKeys(withoutSettings)
    expect(filled.settings).toEqual({ labelWidth: 80, labelAlign: 'top' })
    // 不改动输入
    expect((withoutSettings as { settings?: unknown }).settings).toBeUndefined()
  })

  it('settings 已存在时原样保留，不做任何改写', () => {
    const def = buildDef()
    def.settings = { labelWidth: 120, labelAlign: 'left' }
    const filled = ensureDslKeys(def)
    expect(filled.settings).toEqual({ labelWidth: 120, labelAlign: 'left' })
  })

  it('缺 settings 的定义在设计器里也能正常投影出 schema（不抛错、不白屏）', () => {
    const def = buildDef()
    delete (def as { settings?: unknown }).settings
    const state = createFormBuilderState()
    expect(() => state.setFormDefinition(def, { resetHistory: true })).not.toThrow()
    expect(state.formSchema.value.length).toBeGreaterThan(0)
  })
})
