import { dslToSchema, schemaToDsl } from './src/dsl'
import type { FormDefinition, FieldNode, ContainerNode, LayoutNode } from './src/dsl'
import { evalExpr } from './src/dsl'

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error(`✗ ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`✓ ${msg}`)
  }
}

// ─── 构造一个覆盖字段/容器/布局/条件/校验的 DSL ────────────────────────────────

const field = (name: string, type = 'text', extra: Partial<FieldNode> = {}): FieldNode => ({
  id: `f_${name}`,
  category: 'field',
  type,
  name,
  label: name,
  ...extra,
})

const dsl: FormDefinition = {
  version: 1,
  id: 'login',
  name: '登录',
  settings: { layout: 'vertical', labelWidth: 120, labelAlign: 'left', columns: 12 },
  root: {
    id: 'root',
    category: 'container',
    type: 'group',
    dataType: 'object',
    children: [
      field('username', 'text', {
        layout: { colspan: 6 },
        validation: [{ rule: 'required' }, { rule: 'min', args: [3], message: '至少 3 个字符' }],
        visibleIf: { type: 'call', fn: 'eq', args: [{ type: 'field', name: 'userType' }, { type: 'literal', value: 'admin' }] },
      }),
      field('age', 'number', {
        value: { $expr: { type: 'call', fn: 'add', args: [{ type: 'field', name: 'birthYear' }, { type: 'literal', value: 1 }] } },
        options: undefined,
        layout: { colspan: 6 },
      }),
      field('userType', 'select', {
        options: [
          { label: '管理员', value: 'admin' },
          { label: '用户', value: 'user' },
        ],
      }),
      {
        id: 'addr_group',
        category: 'container',
        type: 'group',
        dataType: 'object',
        name: 'address',
        label: '地址',
        children: [field('city', 'text'), field('zip', 'text', { layout: { colspan: 4 } })],
      } as ContainerNode,
      {
        id: 'list_box',
        category: 'container',
        type: 'list',
        dataType: 'array',
        name: 'items',
        label: '明细',
        children: [field('qty', 'number'), field('sku', 'text')],
      } as ContainerNode,
      {
        id: 'card_box',
        category: 'layout',
        type: 'card',
        label: '卡片',
        children: [field('note', 'textarea', { layout: { colspan: 6 } })],
      } as LayoutNode,
      {
        id: 'grid_box',
        category: 'layout',
        type: 'grid',
        props: { columns: 12, gap: 4 },
        children: [field('a1', 'text', { layout: { colspan: 4 } }), field('a2', 'text', { layout: { colspan: 8 } })],
      } as LayoutNode,
      {
        id: 'tabs_box',
        category: 'layout',
        type: 'tabs',
        children: [
          { id: 'pane1', category: 'layout', type: 'tabsPane', label: 'Tab1', children: [field('t1', 'text')] },
          { id: 'pane2', category: 'layout', type: 'tabsPane', label: 'Tab2', children: [field('t2', 'email')] },
        ],
      } as LayoutNode,
    ],
  },
}

console.log('── DSL → Schema ──')
const schema = dslToSchema(dsl)
console.log(JSON.stringify(schema, null, 2))

console.log('\n── Schema → DSL（往返）──')
const back = schemaToDsl(schema)
console.log(JSON.stringify(back.root, null, 2))

// ─── 往返校验 ──────────────────────────────────────────────────────────────────

const norm = (v: unknown): any => {
  const strip = (n: any): any => {
    if (Array.isArray(n)) return n.map(strip)
    if (n && typeof n === 'object') {
      const copy: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(n)) {
        if (key === 'id' || key === 'key') continue
        if (val === undefined) continue
        copy[key] = strip(val)
      }
      return Object.fromEntries(Object.keys(copy).sort().map((k) => [k, copy[k]]))
    }
    return n
  }
  return strip(v)
}

assert(JSON.stringify(norm(back)) === JSON.stringify(norm(dsl)), 'dslToSchema→schemaToDsl 往返恒等')

// 校验字段提取
const username = back.root.children[0] as FieldNode
assert(username.name === 'username', '字段 name 保留')
assert(username.validation?.[0]?.rule === 'required', '校验 required 保留')
assert(username.validation?.[1]?.message === '至少 3 个字符', '校验 message 保留')
assert(
  username.visibleIf && JSON.stringify(username.visibleIf) === JSON.stringify(dsl.root.children[0].visibleIf),
  'visibleIf 条件 AST 保留',
)

const age = back.root.children[1] as FieldNode
assert(JSON.stringify(age.value) === JSON.stringify(dsl.root.children[1].value), '值表达式 AST 保留')

// 容器/布局类型
assert(back.root.children[3].category === 'container' && (back.root.children[3] as ContainerNode).type === 'group', 'group 容器识别')
assert(back.root.children[4].category === 'container' && (back.root.children[4] as ContainerNode).type === 'list', 'list 容器识别')
assert(back.root.children[5].category === 'layout' && (back.root.children[5] as LayoutNode).type === 'card', 'card 布局识别')
assert(back.root.children[6].category === 'layout' && (back.root.children[6] as LayoutNode).type === 'grid', 'grid 布局识别')
assert(back.root.children[7].category === 'layout' && (back.root.children[7] as LayoutNode).type === 'tabs', 'tabs 布局识别')
const tabs = back.root.children[7] as LayoutNode
assert(tabs.children.length === 2 && tabs.children[0].type === 'tabsPane', 'tabs pane 识别')
assert(back.settings.labelWidth === 120 && back.settings.labelAlign === 'left', '表单设置保留')

// ─── 表达式求值 ────────────────────────────────────────────────────────────────

console.log('\n── 表达式求值 ──')
const expr = { type: 'call', fn: 'and', args: [
  { type: 'call', fn: 'gt', args: [{ type: 'field', name: 'age' }, { type: 'literal', value: 18 }] },
  { type: 'call', fn: 'contains', args: [{ type: 'field', name: 'city' }, { type: 'literal', value: '上海' }] },
] }
const result = evalExpr(expr, { age: 20, city: '上海市' })
assert(result.ok === true && result.value === true, `evalExpr 求值正确 (${JSON.stringify(result)})`)
assert(result.ok && result.deps.includes('age') && result.deps.includes('city'), 'evalExpr 依赖收集')

// ─── P2：真实画布状态往返无损 ─────────────────────────────────────────────────
// 用与 src/elements/definitions/ + 画布一致的真实节点形状，验证 schemaToDsl →
// dslToSchema 不丢数据（__key / 分类 / 配置 / 容器结构）。
console.log('\n── 真实画布状态往返 ──')

const canonical = (v: unknown): any => {
  const INTERNAL_KEYS = new Set(['listKey', 'cardKey', 'tabsKey', 'inputGroupKey', 'modelValue'])
  const strip = (n: any): any => {
    if (Array.isArray(n)) return n.map(strip)
    if (n && typeof n === 'object') {
      const copy: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(n)) {
        if (key === 'id' || key === 'key') continue
        if (INTERNAL_KEYS.has(key)) continue
        if (key === 'outerClass' && val === 'col-span-12') continue
        if (val === undefined) continue
        copy[key] = strip(val)
      }
      if (copy.props && typeof copy.props === 'object' && !Array.isArray(copy.props)) {
        for (const [key, val] of Object.entries(copy.props as Record<string, unknown>)) {
          if (!(key in copy)) copy[key] = strip(val)
        }
        delete copy.props
      }
      return Object.fromEntries(Object.keys(copy).sort().map((k) => [k, copy[k]]))
    }
    return n
  }
  return strip(v)
}

const roundTrip = (children: any[]) => {
  const wrapped = [{ $formkit: 'form', name: 'form', props: {}, children }]
  const dsl = schemaToDsl(wrapped)
  const back = dslToSchema(dsl)
  return { dsl, backChildren: (back[0] as any).children as any[] }
}

const assertNodeRoundTrip = (label: string, node: any) => {
  const { dsl, backChildren } = roundTrip([node])
  const ok = JSON.stringify(canonical(backChildren)) === JSON.stringify(canonical([node]))
  assert(ok, `${label} schema 往返恒等`)
  return { dslNode: dsl.root.children[0] as FormNode, backChildren }
}

// 文本字段（含嵌套 props / __key / 校验）
const textField = {
  $formkit: 'text',
  name: 'username',
  id: 'field_abc',
  __key: 'abc',
  label: '用户名',
  outerClass: 'col-span-6',
  props: { size: 'medium', disabled: false, clearable: true },
  validation: 'required|min:3',
  'validation-messages': { min: '至少 3 个字符' },
}

// 下拉字段（options）
const selectField = {
  $formkit: 'select',
  name: 'role',
  id: 'field_role',
  __key: 'role_k',
  label: '角色',
  outerClass: 'col-span-12',
  options: [
    { label: '管理员', value: 'admin' },
    { label: '用户', value: 'user' },
  ],
}

const realNodes: Record<string, any> = {
  submit: { $formkit: 'submit', outerClass: 'col-span-12 pt-2', type: 'submit', name: 'submit_button', label: 'Submit' },
  reset: { $formkit: 'reset', outerClass: 'col-span-12 pt-2', type: 'reset', name: 'reset_button', label: 'Reset' },
  naiveP: { $formkit: 'naiveP', name: '段落', outerClass: 'col-span-12', props: { type: 'default', depth: 1, align: 'start', text: 'text' }, id: 'naive_p_static' },
  naiveH2: { $formkit: 'naiveH2', name: '标题', outerClass: 'col-span-12', props: { text: 'text' }, id: 'naive_h2_static' },
  naiveButton: { $formkit: 'naiveButton', name: '按钮', label: '按钮', outerClass: 'col-span-12 pt-2', buttonProps: { block: false, size: 'medium' } },
  naiveUl: { $formkit: 'naiveUl', name: '列表', outerClass: 'col-span-12', options: ['Item 1', 'Item 2'], id: 'naive_ul_static' },
  naiveDivider: { $formkit: 'naiveDivider', name: '分割线', outerClass: 'col-span-12', props: { title: 'Divider', dashed: false } },
  naiveAlert: { $formkit: 'naiveAlert', name: '提示', outerClass: 'col-span-12', props: { title: 'Title', type: 'default' } },
  '文本字段': textField,
  '下拉字段': selectField,
}

for (const [label, node] of Object.entries(realNodes)) {
  const { dslNode } = assertNodeRoundTrip(label, node)
  const expectedCategory =
    node.$formkit === 'text' || node.$formkit === 'select'
      ? 'field'
      : node.$formkit && !node.$el && !node.$cmp
        ? 'static'
        : 'unknown'
  assert(dslNode.category === expectedCategory && dslNode.type === node.$formkit, `${label} 分类/类型识别`)
}

// __key 保留
const { dsl: dslWithKey } = roundTrip([textField])
const keyedUsername = dslWithKey.root.children[0] as FieldNode
assert(keyedUsername.key === 'abc' && keyedUsername.id === 'field_abc', '字段 __key 保留')
const usernameSchema = dslToSchema(dslWithKey)[0] as any
assert(usernameSchema.children[0].__key === 'abc', '字段 __key 写回 schema')

// 容器 + 嵌套往返
const listNode = {
  $cmp: 'list',
  __key: 'list_abc',
  name: 'items',
  label: '明细',
  outerClass: 'col-span-12',
  props: { listKey: 'list_abc', showActions: false, modelValue: [textField] },
  children: [textField],
}
const { dslNode: listDsl } = assertNodeRoundTrip('list 容器', listNode)
assert(listDsl.category === 'container' && listDsl.type === 'list', 'list 容器分类')
assert((listDsl as ContainerNode).children?.[0]?.type === 'text', 'list 容器子节点保留')

const cardNode = {
  $cmp: 'card',
  __key: 'card_1',
  props: { cardKey: 'card_1', title: '卡片', modelValue: [selectField] },
  children: [selectField],
}
const { dslNode: cardDsl } = assertNodeRoundTrip('card 布局', cardNode)
assert(cardDsl.category === 'layout' && cardDsl.type === 'card', 'card 布局分类')
assert((cardDsl as LayoutNode).label === '卡片', 'card 标题保留')

const tabsNode = {
  $cmp: 'tabs',
  __key: 'tabs_1',
  props: { tabsKey: 'tabs_1', modelValue: [{ __key: 'pane_1', label: 'Tab1', children: [textField] }] },
  children: [{ __key: 'pane_1', label: 'Tab1', children: [textField] }],
}
const { dslNode: tabsDsl } = assertNodeRoundTrip('tabs 布局', tabsNode)
assert(tabsDsl.category === 'layout' && tabsDsl.type === 'tabs', 'tabs 布局分类')
const panes = (tabsDsl as LayoutNode).children
assert(panes.length === 1 && panes[0].type === 'tabsPane' && panes[0].key === 'pane_1', 'tabs pane 保留 __key')

