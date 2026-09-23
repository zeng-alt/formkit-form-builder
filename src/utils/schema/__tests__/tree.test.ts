// ═══ schema 树路径操作：不改动输入 ═══════════════════════════════════════════════
// 这组函数被画布写路径用在 formSchema（DSL 的 computed 只读投影）上。若原地改写了
// 输入的嵌套 children 数组，被污染的是 computed 的缓存值——同一引用在别处被当作
// "旧快照"比较时会误判为未变更，响应式更新也可能丢失。
// 用深冻结的输入：ESM 默认严格模式，任何原地写都会直接抛 TypeError，比事后比对快照
// 更能精确定位到"哪一步写了输入"。
import { describe, it, expect } from 'vitest'
import {
  findNodeByKey,
  updateAtPath,
  removeAtPath,
  insertAfterAtPath,
} from '../tree'
import type { SchemaNode } from '../types'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v)
    Object.freeze(value)
  }
  return value
}

// 三层嵌套：root[0](card) → children[0](group) → children[1](text b)
function fixture(): SchemaNode[] {
  return [
    {
      $cmp: 'card',
      __key: 'card',
      children: [
        {
          $formkit: 'group',
          __key: 'group',
          children: [
            { $formkit: 'text', __key: 'a', name: 'a' },
            { $formkit: 'text', __key: 'b', name: 'b' },
          ],
        },
      ],
    },
    { $formkit: 'text', __key: 'root', name: 'root' },
  ] as unknown as SchemaNode[]
}

const pathOf = (schema: SchemaNode[], key: string) => findNodeByKey(schema, key)!.path

describe('schema 树路径操作不改动输入', () => {
  it('updateAtPath：替换深层节点，返回新树，输入保持不变', () => {
    const input = deepFreeze(fixture())
    const snapshot = JSON.stringify(input)
    const next = updateAtPath(input, pathOf(input, 'b'), {
      $formkit: 'text',
      __key: 'b',
      name: 'b2',
    } as unknown as SchemaNode)

    expect(JSON.stringify(input)).toBe(snapshot)
    expect(findNodeByKey(next, 'b')!.node.name).toBe('b2')
    // 路径上的每一层都是新对象，路径外的兄弟节点复用原引用
    expect(next[0]).not.toBe(input[0])
    expect(next[1]).toBe(input[1])
  })

  it('removeAtPath：删除深层节点，输入保持不变', () => {
    const input = deepFreeze(fixture())
    const snapshot = JSON.stringify(input)
    const next = removeAtPath(input, pathOf(input, 'a'))

    expect(JSON.stringify(input)).toBe(snapshot)
    expect(findNodeByKey(next, 'a')).toBeNull()
    expect(findNodeByKey(next, 'b')).not.toBeNull()
  })

  it('insertAfterAtPath：在深层节点后插入，输入保持不变', () => {
    const input = deepFreeze(fixture())
    const snapshot = JSON.stringify(input)
    const next = insertAfterAtPath(input, pathOf(input, 'a'), {
      $formkit: 'text',
      __key: 'new',
      name: 'new',
    } as unknown as SchemaNode)

    expect(JSON.stringify(input)).toBe(snapshot)
    const group = findNodeByKey(next, 'group')!.node
    expect((group.children as SchemaNode[]).map((c) => c.__key)).toEqual(['a', 'new', 'b'])
  })

  it('removeAtPath / insertAfterAtPath 作用于根层', () => {
    const input = deepFreeze(fixture())
    expect(removeAtPath(input, [1]).map((n) => n.__key)).toEqual(['card'])
    expect(
      insertAfterAtPath(input, [0], { $formkit: 'text', __key: 'x' } as unknown as SchemaNode).map(
        (n) => n.__key,
      ),
    ).toEqual(['card', 'x', 'root'])
  })
})
