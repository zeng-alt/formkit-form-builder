// ═══ X：字段/容器按需加载——collectElementTypes / preloadElementComponents ═══════
import { describe, it, expect } from 'vitest'
import { DSL_VERSION } from '@/dsl'
import type { ContainerNode, FieldNode, FormDefinition, FormNode } from '@/types/dsl'
import {
  collectElementTypes,
  createLazyComponent,
  getAllLazyElementTypes,
  hasLazyLoader,
  isTypeLoaded,
  preloadElementComponents,
} from '../component-loader'

function field(overrides: Partial<FieldNode> & { id: string; type: string }): FieldNode {
  return {
    category: 'field',
    renderAs: 'formkit',
    name: overrides.id,
    ...overrides,
  } as FieldNode
}

function container(
  overrides: Partial<ContainerNode> & { id: string; type: string; children: FormNode[] },
): ContainerNode {
  return {
    category: 'container',
    renderAs: 'cmp',
    dataType: 'object',
    ...overrides,
  } as ContainerNode
}

function buildDefinition(): FormDefinition {
  // 嵌套容器：card > list > text；再加一个 dataTable，列本身是普通字段节点
  // （日期 + 文本两列）——数据表格列元素的类型也要被收集到。
  return {
    version: DSL_VERSION,
    id: 'nested',
    name: 'nested',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [
        container({
          id: 'card-1',
          type: 'card',
          children: [
            container({
              id: 'list-1',
              type: 'list',
              dataType: 'array',
              children: [field({ id: 'name', type: 'text' })],
            }),
          ],
        }),
        container({
          id: 'table-1',
          type: 'dataTable',
          dataType: 'array',
          children: [
            field({ id: 'col-date', type: 'date' }),
            field({ id: 'col-name', type: 'text' }),
          ],
        }),
      ],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
}

describe('collectElementTypes', () => {
  it('覆盖嵌套容器（card > list）与数据表格列', () => {
    const types = collectElementTypes(buildDefinition())
    expect(types).toEqual(
      expect.arrayContaining(['group', 'card', 'list', 'text', 'dataTable', 'date']),
    )
  })

  it('同一类型出现多次只返回一次', () => {
    const types = collectElementTypes(buildDefinition())
    expect(types.filter((t) => t === 'text')).toHaveLength(1)
  })
})

describe('hasLazyLoader / getAllLazyElementTypes', () => {
  it('按需类型（如 date/dataTable）能查到 loader，始终静态加载的类型（如 text）查不到', () => {
    expect(hasLazyLoader('date')).toBe(true)
    expect(hasLazyLoader('dataTable')).toBe(true)
    expect(hasLazyLoader('text')).toBe(false)
  })

  it('全部按需类型清单非空，且都能各自查到 loader', () => {
    const all = getAllLazyElementTypes()
    expect(all.length).toBeGreaterThan(0)
    for (const type of all) expect(hasLazyLoader(type)).toBe(true)
  })
})

describe('preloadElementComponents', () => {
  it('同一类型只加载一次：重复预加载 resolve 到同一个组件引用，不产生新的加载态', async () => {
    const type = 'naiveProgress'
    expect(hasLazyLoader(type)).toBe(true)

    await Promise.all([
      preloadElementComponents([type]),
      preloadElementComponents([type]),
      preloadElementComponents([type]),
    ])
    expect(isTypeLoaded(type)).toBe(true)

    // createLazyComponent 内部按类型缓存 defineAsyncComponent 实例：加载完成前后
    // 多次取都应该是同一个组件引用，而不是每次都拿到一个新的、要重新经历加载态的实例
    const compA = createLazyComponent(type)
    await preloadElementComponents([type])
    const compB = createLazyComponent(type)
    expect(compA).toBe(compB)
  })

  it('未知/始终静态加载的类型直接忽略，不抛错', async () => {
    await expect(preloadElementComponents(['not-a-real-type', 'text'])).resolves.toBeUndefined()
  })
})
