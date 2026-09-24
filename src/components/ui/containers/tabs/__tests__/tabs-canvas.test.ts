// @vitest-environment happy-dom
// ═══ 真实渲染集成测试：设计器画布的 tabs 容器所见即所得 ═══════════════════════════
// 背景：运行时 TabsContainerPreview 用 naive-ui NTabs，支持 type/placement/size/
// animated/closable；此前画布 TabsContainer 自绘一排 div，完全不读这些属性——右侧面板
// 把类型改成 card、位置改成 left，画布毫无变化。现在画布也用 NTabs，属性经
// DSL → schema（layoutNodeToSchema 的 objectOfObjects 分支）→ 容器 props 原样透传，
// 这里挂载完整设计器（BuilderMain）验证这条链路真的打通，而不是只测组件单元。
//
// 不硬编码 naive-ui 内部标记 class（type/placement 对应的 class 名随版本可能变化）：
// 参照 form-disabled.test.ts 的做法，同一属性分别取两个取值裸挂载 NTabs，对比渲染出的
// class 差集，取"目标值独有"的那部分作为标记，再断言画布真的渲染出了它。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { plugin as formkitPlugin } from '@formkit/vue'
import { NTabPane, NTabs } from 'naive-ui'
import formkitDefaultConfig from '@/formkit.config'
import FormBuilder from '@/builder/BuilderMain.vue'
import FormRenderer from '@/renderer/FormRenderer.vue'
import { DSL_VERSION, getElementTypeDef } from '@/dsl'
import type { FieldNode, FormDefinition, LayoutNode } from '@/types/dsl'

const settle = async () => {
  for (let i = 0; i < 8; i++) await nextTick()
}

function collectClasses(root: Element): Set<string> {
  const set = new Set<string>()
  root.classList.forEach((c) => set.add(c))
  root.querySelectorAll('*').forEach((el) => el.classList.forEach((c) => set.add(c)))
  return set
}

// 基准：NTabs 某个 prop 分别取 a / b 两个值裸挂载一次，返回"b 独有"的 class 差集
// （即 b 取值对应的渲染标记）。空集合直接抛错，同 form-disabled.test.ts 的处理方式。
function deriveOnlyClasses(propKey: 'type' | 'placement', a: string, b: string): Set<string> {
  const build = (value: string) =>
    mount(NTabs, {
      props: { [propKey]: value, value: 'p1' } as Record<string, unknown>,
      slots: { default: () => h(NTabPane, { name: 'p1', tab: 'P1' }, () => 'x') },
    })
  const wa = build(a)
  const wb = build(b)
  const setA = collectClasses(wa.element)
  const setB = collectClasses(wb.element)
  const bOnly = new Set([...setB].filter((c) => !setA.has(c)))
  wa.unmount()
  wb.unmount()
  if (bOnly.size === 0) {
    throw new Error(
      `NTabs 基准推导失败：${propKey}="${a}"/"${b}" 两次裸挂载渲染出的 class 完全一样，推不出「${b}」的标记 class`,
    )
  }
  return bOnly
}

function buildField(name: string, label: string): FieldNode {
  const field = getElementTypeDef('text')!.defaults() as FieldNode
  field.name = name
  field.label = label
  return field
}

function buildTabsDefinition(tabsProps: Record<string, unknown>) {
  const pane1Key = 'pane1'
  const pane2Key = 'pane2'
  const field1 = buildField('f1', '字段1')
  const pane1: LayoutNode = {
    id: pane1Key,
    key: pane1Key,
    category: 'layout',
    type: 'tabsPane',
    renderAs: 'el',
    label: 'Tab 1',
    children: [field1],
  }
  const pane2: LayoutNode = {
    id: pane2Key,
    key: pane2Key,
    category: 'layout',
    type: 'tabsPane',
    renderAs: 'el',
    label: 'Tab 2',
    children: [],
  }
  const tabs: LayoutNode = {
    id: 'tabs1',
    key: 'tabs1',
    category: 'layout',
    type: 'tabs',
    renderAs: 'cmp',
    props: tabsProps,
    children: [pane1, pane2],
  }
  const def: FormDefinition = {
    version: DSL_VERSION,
    id: 'tabs-canvas-test',
    name: 'tabs-canvas-test',
    root: {
      id: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children: [tabs],
    },
    settings: { labelWidth: 80, labelAlign: 'top' },
  }
  return { def, pane1Key, pane2Key }
}

function mountBuilder(tabsProps: Record<string, unknown>) {
  const built = buildTabsDefinition(tabsProps)
  const wrapper = mount(FormBuilder, {
    props: { modelValue: built.def },
    global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
  })
  return { wrapper, ...built }
}

describe('设计器画布：tabs 容器所见即所得', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('type=card 时画布应渲染出 NTabs 的 card 类型标记 class', async () => {
    const cardOnly = deriveOnlyClasses('type', 'line', 'card')

    const { wrapper } = mountBuilder({ type: 'card' })
    await settle()

    const rendered = collectClasses(wrapper.element)
    const missing = [...cardOnly].filter((c) => !rendered.has(c))
    expect(
      missing,
      `画布未渲染出 type=card 的标记 class（缺失：${missing.join('/')}）——说明 type 属性没有从节点 props 传到画布组件`,
    ).toEqual([])

    wrapper.unmount()
  })

  it('placement=left 时画布应渲染出左侧布局标记 class', async () => {
    const leftOnly = deriveOnlyClasses('placement', 'top', 'left')

    const { wrapper } = mountBuilder({ placement: 'left' })
    await settle()

    const rendered = collectClasses(wrapper.element)
    const missing = [...leftOnly].filter((c) => !rendered.has(c))
    expect(
      missing,
      `画布未渲染出 placement=left 的标记 class（缺失：${missing.join('/')}）——说明 placement 属性没有从节点 props 传到画布组件`,
    ).toEqual([])

    wrapper.unmount()
  })

  // 画布左侧元素面板自己也有一套分类用的 NTabs，用画布根 drop-area（perf.mjs /
  // smoke3.mjs 等浏览器脚本同款的 [data-testid^="drop-area"]）限定范围，
  // 避免选到左侧面板那套无关的 .n-tabs。
  const CANVAS_TABS = '[data-testid^="drop-area"] .n-tabs'

  it('画布应真的渲染出 NTabs（而不是自绘 div），pane 内容在 NTabs 内部', async () => {
    const { wrapper } = mountBuilder({})
    await settle()

    const tabsEl = wrapper.find(CANVAS_TABS)
    expect(tabsEl.exists(), '画布应渲染出 naive-ui 的 .n-tabs，而不是自绘的标签栏').toBe(true)
    // 字段1 在第一个 pane，默认激活态，应能在 .n-tabs 内部找到（NTabPane 内容区）
    expect(tabsEl.find('.n-tab-pane').exists(), 'pane 内容应渲染在 NTabPane 里').toBe(true)
    expect(tabsEl.text()).toContain('字段1')

    wrapper.unmount()
  })

  it('新增标签：点击新增按钮应新增一个 pane', async () => {
    // naive-ui 的原生 addable 只在 type="card" 时渲染出「+」（核实过 Tab.mjs 源码），
    // 画布用自己的 suffix 按钮（.tabs-add-btn）保证四种 type 下都能新增标签
    const { wrapper } = mountBuilder({})
    await settle()

    const before = wrapper
      .findAll(`${CANVAS_TABS} .n-tabs-tab`)
      .filter((t) => !t.classes().includes('n-tabs-tab--addable'))
    expect(before.length).toBe(2)

    const addBtn = wrapper.find(`${CANVAS_TABS} .tabs-add-btn`)
    expect(addBtn.exists(), '应渲染出新增标签按钮').toBe(true)
    await addBtn.trigger('click')
    await settle()

    const after = wrapper
      .findAll(`${CANVAS_TABS} .n-tabs-tab`)
      .filter((t) => !t.classes().includes('n-tabs-tab--addable'))
    expect(after.length, '点击 + 后应新增一个 pane').toBe(3)
    expect(wrapper.find(CANVAS_TABS).text()).toContain('Tab 3')

    wrapper.unmount()
  })

  it('双击标签标题可内联改名', async () => {
    const { wrapper } = mountBuilder({})
    await settle()

    const firstTabLabel = wrapper.find(`${CANVAS_TABS} .tabs-tab-label`)
    expect(firstTabLabel.text()).toContain('Tab 1')
    await firstTabLabel.trigger('dblclick')
    await settle()

    const input = wrapper.find(`${CANVAS_TABS} .n-tabs-tab__label input`)
    expect(input.exists(), '双击后应出现内联改名输入框').toBe(true)
    await input.setValue('改名后的标签')
    await input.trigger('keydown', { key: 'Enter' })
    await settle()

    expect(wrapper.find(CANVAS_TABS).text()).toContain('改名后的标签')
    expect(wrapper.find(CANVAS_TABS).text()).not.toContain('Tab 1')

    wrapper.unmount()
  })

  // H3：改名输入框曾在同一个 <n-input> 上挂 @keydown.enter.stop.prevent +
  // @keydown.esc.stop.prevent 两个处理器，Vue 把它们合并成数组传给 NInput 的
  // onKeydown prop（类型声明为 Function），每次触发都会报
  // `Invalid prop: type check failed for prop "onKeydown". Expected Function, got Array`。
  it('双击改名、回车提交：不应触发 NInput onKeydown 的 prop 类型警告', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { wrapper } = mountBuilder({})
    await settle()

    const firstTabLabel = wrapper.find(`${CANVAS_TABS} .tabs-tab-label`)
    await firstTabLabel.trigger('dblclick')
    await settle()

    const input = wrapper.find(`${CANVAS_TABS} .n-tabs-tab__label input`)
    await input.setValue('改名后的标签')
    await input.trigger('keydown', { key: 'Enter' })
    await settle()

    const badWarning = warnSpy.mock.calls.some((args) =>
      args.some(
        (a) => typeof a === 'string' && a.includes('onKeydown') && a.includes('Expected Function'),
      ),
    )
    expect(badWarning, 'NInput 不应收到数组形态的 onKeydown').toBe(false)

    warnSpy.mockRestore()
    wrapper.unmount()
  })

  // 关闭按钮直接用 NTabPane 的 closable：naive-ui 只在 type=card 时渲染，画布与运行时
  // 表现一致（不给其它 type 额外造一个运行时没有的按钮）
  const closeButtons = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll(`${CANVAS_TABS} .n-tabs-tab .n-base-close`)

  it('closable + card：可关闭标签，只剩最后一个 pane 时不再给关闭', async () => {
    const { wrapper } = mountBuilder({ type: 'card', closable: true })
    await settle()

    expect(closeButtons(wrapper).length, 'closable=true 时每个 pane 都应有关闭按钮').toBe(2)
    await closeButtons(wrapper)[1]!.trigger('click')
    await settle()

    expect(wrapper.find(CANVAS_TABS).text()).not.toContain('Tab 2')
    expect(closeButtons(wrapper).length, '只剩最后一个 pane 时应禁止再关闭').toBe(0)

    wrapper.unmount()
  })

  it('closable + line：与运行时一致，不渲染关闭按钮', async () => {
    const { wrapper } = mountBuilder({ type: 'line', closable: true })
    await settle()
    expect(closeButtons(wrapper).length).toBe(0)
    wrapper.unmount()
  })

  // buildField 没有显式设 __key（只有 name/label），是画布提交时兜底生成的随机
  // key，测试构造阶段拿不到——D3 后按钮改到浮动工具条，只在选中单个元素时出现，
  // 这里按文案定位到该字段的画布条目，模拟真实点击选中它（不需要事先知道 key）。
  // 外层 tabs 容器自己的条目也会因为包含这个字段而文本命中，取最后一个（最内层，
  // 文档顺序里嵌套条目排在外层条目之后）就是字段自己的条目。
  function findFieldItem(wrapper: ReturnType<typeof mount>, label: string) {
    const matches = wrapper
      .findAll('[data-canvas-item="true"]')
      .filter((li) => li.text().includes(label))
    expect(matches.length, `应能找到「${label}」对应的画布条目`).toBeGreaterThan(0)
    return matches[matches.length - 1]!
  }

  it('pane 内字段可删除（画布能力不因改用 NTabs 而丢失）', async () => {
    const { wrapper } = mountBuilder({})
    await settle()

    const tabsEl = wrapper.find(CANVAS_TABS)
    expect(tabsEl.text()).toContain('字段1')

    const item = findFieldItem(wrapper, '字段1')
    await item.trigger('pointerdown')
    await settle()

    const deleteBtn = item.find('button[aria-label="删除字段"]')
    expect(deleteBtn.exists(), 'pane 内字段应能找到删除按钮').toBe(true)
    await deleteBtn.trigger('click')
    await settle()

    expect(wrapper.find(CANVAS_TABS).text()).not.toContain('字段1')

    wrapper.unmount()
  })

  it('pane 内字段可复制（画布能力不因改用 NTabs 而丢失）', async () => {
    const { wrapper } = mountBuilder({})
    await settle()

    const item = findFieldItem(wrapper, '字段1')
    await item.trigger('pointerdown')
    await settle()

    const copyBtn = item.find('button[aria-label="复制一份"]')
    expect(copyBtn.exists(), 'pane 内字段应能找到复制按钮').toBe(true)
    await copyBtn.trigger('click')
    await settle()

    // H6：复制出的副本 label 追加「 副本」后缀，不再是与原字段完全相同的「字段1」
    const labels = wrapper.findAll(`${CANVAS_TABS} label`).map((l) => l.text())
    expect(labels.filter((t) => t === '字段1')).toHaveLength(1)
    expect(labels.filter((t) => t === '字段1 副本')).toHaveLength(1)

    wrapper.unmount()
  })

  // 所见即所得的直接断言：同一份定义分别在设计器画布与 FormRenderer（运行时）里渲染，
  // NTabs 根节点与标签的 naive-ui 类名必须完全一致（type/placement/size 都体现在这些类上）
  const tabsClasses = (el: Element | null) => {
    if (!el) return null
    const tab = el.querySelector('.n-tabs-tab')
    const pick = (e: Element | null) =>
      e ? [...e.classList].filter((c) => c.startsWith('n-tabs')).sort() : []
    return { root: pick(el), tab: pick(tab) }
  }

  it.each([
    { type: 'line' },
    { type: 'card', size: 'large' },
    { type: 'bar', placement: 'left' },
    { type: 'segment', size: 'medium' },
    { type: 'card', placement: 'bottom' },
  ])('画布与运行时的 NTabs 外观类一致：%o', async (tabsProps) => {
    const { wrapper, def } = mountBuilder(tabsProps)
    await settle()
    const canvas = tabsClasses(wrapper.find(CANVAS_TABS).element)
    wrapper.unmount()

    const runtime = mount(FormRenderer, {
      global: { plugins: [[formkitPlugin, formkitDefaultConfig]] },
      props: { definition: def, modelValue: {} },
    })
    await settle()
    const runtimeTabs = tabsClasses(runtime.find('.n-tabs').element)
    runtime.unmount()

    expect(canvas).not.toBeNull()
    expect(canvas!.root.length).toBeGreaterThan(1)
    expect(canvas).toEqual(runtimeTabs)
  })
})
