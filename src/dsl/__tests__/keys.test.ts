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
    settings: { layout: 'vertical', labelWidth: 80, labelAlign: 'top' },
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
})
