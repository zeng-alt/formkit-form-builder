// ═══ H6：复制节点——副本 label 加后缀，容器整体复制不改子项 name ═══════════════════
import { describe, expect, it } from 'vitest'
import { duplicateNode } from '@/utils/dnd/schema'
import type { FormKitSchemaFormKit } from '@formkit/core'

describe('duplicateNode', () => {
  it('普通字段：name 重新生成去重，label 追加后缀', () => {
    const source = {
      $formkit: 'text',
      __key: 'k1',
      name: 'field_1',
      label: '姓名',
      id: 'field_k1',
    } as unknown as FormKitSchemaFormKit
    const names = new Set(['field_1'])
    const clone = duplicateNode(source, names, { labelSuffix: ' 副本' }) as any

    expect(clone.__key).not.toBe('k1')
    expect(clone.name).not.toBe('field_1')
    expect(clone.name).toMatch(/^field_\d+$/)
    expect(clone.label).toBe('姓名 副本')
    // 原节点不受影响（纯函数）
    expect(source.label).toBe('姓名')
  })

  it('$cmp 包装字段（如文本输入框）：label 落在 props.label，同样要追加后缀', () => {
    // 大多数输入类字段（text/email/number...）在 schema 里是 $cmp 包装节点，
    // label 存在 props.label 而不是顶层 label——这是实际线上会命中的形状
    const source = {
      $cmp: 'text',
      __key: 'age',
      name: 'age',
      props: { label: '年龄', id: 'age', name: 'age' },
      outerClass: 'col-span-12',
    } as unknown as FormKitSchemaFormKit
    const clone = duplicateNode(source, new Set(['age']), { labelSuffix: ' 副本' }) as any
    expect(clone.props.label).toBe('年龄 副本')
    expect(clone.name).not.toBe('age')
  })

  it('未传 labelSuffix 时不追加后缀（向后兼容旧调用方）', () => {
    const source = {
      $formkit: 'text',
      __key: 'k1',
      name: 'field_1',
      label: '姓名',
    } as unknown as FormKitSchemaFormKit
    const clone = duplicateNode(source, new Set(['field_1'])) as any
    expect(clone.label).toBe('姓名')
  })

  it('容器（card）整体复制：只改容器自身 label/name，子项 name 保持不变', () => {
    const source = {
      $cmp: 'card',
      __key: 'card1',
      name: 'card_a',
      label: '基本信息',
      props: { cardKey: 'card1', name: 'card_a' },
      children: [
        { $formkit: 'text', __key: 'f1', name: 'firstName', label: '名' },
        { $formkit: 'text', __key: 'f2', name: 'lastName', label: '姓' },
      ],
    } as unknown as FormKitSchemaFormKit
    const names = new Set(['card_a', 'firstName', 'lastName'])
    const clone = duplicateNode(source, names, { labelSuffix: ' 副本' }) as any

    // 容器自身：key/name 重新生成，label 加后缀
    expect(clone.__key).not.toBe('card1')
    expect(clone.name).not.toBe('card_a')
    expect(clone.label).toBe('基本信息 副本')

    // 子项：key 重新生成（DnD 身份不能重复），但 name/label 原样保留，不加后缀
    expect(clone.children).toHaveLength(2)
    expect(clone.children[0].__key).not.toBe('f1')
    expect(clone.children[0].name).toBe('firstName')
    expect(clone.children[0].label).toBe('名')
    expect(clone.children[1].name).toBe('lastName')
    expect(clone.children[1].label).toBe('姓')
  })

  it('不建立数据作用域的容器（badge）整体复制：子字段必须重新生成 name', () => {
    // badge/buttonGroup/dataTable 的 dataShape 为 none，运行时不包 group，子字段与容器的
    // 兄弟同处表单数据同一层：保留原名会与原件子字段共用一个 key，后填的值覆盖先填的
    const source = {
      $cmp: 'badge',
      __key: 'b1',
      props: { badgeKey: 'b1', value: 1 },
      children: [{ $formkit: 'text', __key: 'f1', name: 'age', label: '年龄' }],
    } as unknown as FormKitSchemaFormKit
    const clone = duplicateNode(source, new Set(['age'])) as any
    expect(clone.children[0].name).not.toBe('age')
    expect(clone.children[0].name).toMatch(/^field_\d+$/)
  })

  it('tabs 容器整体复制：直接子项（pane）重新生成 name 避免与原容器的 pane 撞名，pane 内字段保留原名', () => {
    const source = {
      $cmp: 'tabs',
      __key: 'tabs1',
      props: { tabsKey: 'tabs1' },
      children: [
        {
          __key: 'pane1',
          __paneType: 'tabs',
          name: 'tab_a',
          label: 'Tab 1',
          children: [{ $formkit: 'text', __key: 'f1', name: 'value', label: '取值' }],
        },
      ],
    } as unknown as FormKitSchemaFormKit
    const names = new Set(['tab_a', 'value'])
    const clone = duplicateNode(source, names, { labelSuffix: ' 副本' }) as any

    const pane = clone.children[0]
    // pane 是 tabs 的直接子项：必须重新生成 name，否则运行时两个 tabs 的同名 pane
    // 数据会互相覆盖（H1 的核心问题）
    expect(pane.name).not.toBe('tab_a')
    expect(pane.label).toBe('Tab 1') // pane 的展示标题不受复制影响
    // pane 内部字段：保留原名（已经在 pane 新生成的作用域里，不会撞车）
    expect(pane.children[0].name).toBe('value')
  })
})
