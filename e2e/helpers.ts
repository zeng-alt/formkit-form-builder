// ═══ e2e 冒烟测试公共工具 ══════════════════════════════════════════════════════
// 拖拽手势、DSL 预置、主题切换三类复用逻辑集中在这里，各用例文件只关心自己的断言。
// 写法参考手工验证阶段用过的脚本（拖拽分步 mouse.move 参考 r-groups.mjs 的 drag()，
// 预置 DSL / 切主题的 localStorage 写法参考 r-collapse.mjs、g-verify.mjs）。
import { test as base, expect, type Page, type Locator } from '@playwright/test'
import type { FormDefinition, FormNode, Expr } from '../src/types/dsl'

// playground/src/App.vue 启动时读取初始定义的 key；useColorMode()（@vueuse/core）
// 未自定义 storageKey 时的默认存储 key——两者都不是这套测试自己发明的约定，是在读
// 现有代码后照抄的真实存储位置。
export const DEMO_STORAGE_KEY = 'formkit-form-builder:demo'
export const COLOR_SCHEME_STORAGE_KEY = 'vueuse-color-scheme'

// ─── 每个用例自动挂 pageerror / console.error 监听 ──────────────────────────────
// auto fixture：无需在每个 test() 里手写监听样板，出现即在用例结束时判失败。
export const test = base.extend<{ _watchConsole: void }>({
  _watchConsole: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`)
      })
      await use()
      expect(errors, `页面出现未预期的错误：\n${errors.join('\n')}`).toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** 构造一个最小可用的字段节点，省去每个用例重复写 renderAs/category 等样板字段。 */
export function field(overrides: Partial<FormNode> & { id: string; type: string }): FormNode {
  return {
    category: 'field',
    renderAs: 'formkit',
    key: overrides.id,
    name: overrides.id,
    ...overrides,
  } as FormNode
}

/** `$name == value` 这一类最常用的条件表达式 AST（eq），构造帮助函数。 */
export function eqExpr(name: string, value: unknown): Expr {
  return {
    type: 'call',
    fn: 'eq',
    args: [
      { type: 'field', name },
      { type: 'literal', value },
    ],
  }
}

/** 包一层根容器（group/object），组出可以直接塞进 localStorage 的完整定义。 */
export function definitionOf(
  children: FormNode[],
  overrides: Partial<FormDefinition> = {},
): FormDefinition {
  return {
    version: 1,
    id: 'e2e-demo',
    name: 'e2e-demo',
    settings: { labelAlign: 'top', labelWidth: 80 },
    root: {
      id: 'root',
      key: 'root',
      category: 'container',
      type: 'group',
      renderAs: 'formkit',
      dataType: 'object',
      children,
    },
    ...overrides,
  }
}

/**
 * 打开设计器页面，加载前把给定 DSL 定义 + 主题写进 localStorage
 * （用 addInitScript 而不是 goto 后再 evaluate：必须在应用自己的启动脚本读取
 * localStorage 之前写入，否则读到的还是上一次的空/默认定义）。
 */
export async function gotoWithDefinition(
  page: Page,
  definition: FormDefinition,
  options: { colorScheme?: 'light' | 'dark' } = {},
): Promise<void> {
  await page.addInitScript(
    ([demoKey, defJson, schemeKey, scheme]) => {
      localStorage.clear()
      localStorage.setItem(demoKey, defJson)
      if (scheme) localStorage.setItem(schemeKey, scheme)
    },
    [
      DEMO_STORAGE_KEY,
      JSON.stringify(definition),
      COLOR_SCHEME_STORAGE_KEY,
      options.colorScheme ?? '',
    ] as [string, string, string, string],
  )
  await page.goto('/')
  // 画布根 drop-area 出现即视为设计器加载完成，用它做自动等待而不是固定 sleep。
  await rootDropArea(page).waitFor({ state: 'visible' })
}

/** 画布根 drop-area（CanvasBoard.vue 的 rootDropAreaAttrs，testid 带实例后缀）。 */
export function rootDropArea(page: Page): Locator {
  return page.locator('[data-testid^="drop-area"]').first()
}

/** 左侧元素面板按 tab 名切换（字段 / 容器 / 静态，见 NavMain.vue 的 n-tabs）。 */
export async function switchPaletteTab(
  page: Page,
  tabName: '字段' | '容器' | '静态',
): Promise<void> {
  await page.locator('.n-tabs-tab', { hasText: tabName }).first().click()
}

/** 画布上按 DSL key 定位条目（CanvasGridItem.vue 的 data-item-key）。 */
export function canvasItem(page: Page, key: string): Locator {
  return page.locator(`[data-item-key="${key}"]`)
}

/**
 * 点击选中画布条目，并把焦点落在条目 `<li>` 本身而不是它内部渲染出的 FormKit
 * 控件（input/switch 等）——很多字段直接点在预览控件上会把浏览器焦点带进那个
 * 控件，之后 Ctrl+C/Ctrl+Z 这类快捷键会被 use-keyboard-shortcuts.ts 的
 * isEditableTarget() 判定为"正在打字"而直接放行给控件本身，画布快捷键完全不触发。
 * 点条目左上角空白角落（4,4）既能选中，又不落在任何内部控件上。
 */
export async function selectCanvasItem(page: Page, key: string): Promise<Locator> {
  const item = canvasItem(page, key)
  await item.click({ position: { x: 4, y: 4 } })
  return item
}

/**
 * 让焦点落在画布空白处（既不是文本输入框，也不是某个随时可能被撤销/删除掉的
 * 画布条目）。use-keyboard-shortcuts.ts 的快捷键监听挂在 BuilderMain 根节点上，
 * 靠事件从子孙冒泡上来触发；如果直接把 document.activeElement.blur() 到
 * <body>，body 是 BuilderMain 根节点的祖先而非子孙，键盘事件根本不会经过
 * BuilderMain，快捷键就彻底失灵——所以必须真的点在 BuilderMain 子树内的某个
 * 空白区域，而不是简单地"清空焦点"。点画布卡片外围的空白留白（CanvasBoard.vue
 * 那个 `flex-1 flex justify-center px-4 relative` 容器的左上角），这块区域始终
 * 存在、不会随撤销/重做被移除，比点某个具体画布条目更稳。
 */
export async function focusBlankCanvasArea(page: Page): Promise<void> {
  await page
    .locator('.flex-1.flex.justify-center.px-4.relative')
    .first()
    .click({ position: { x: 5, y: 5 } })
}

/**
 * 真实鼠标拖拽：mousedown → 分步 mousemove → mouseup。
 * @formkit/drag-and-drop 面板拖出用的是浏览器原生 HTML5 DnD（nativeDrag: true），
 * 但原生 dragstart 序列由 Chromium 在检测到"draggable 元素上按下并持续移动超过
 * 阈值"时自行触发，不需要用 JS 手动 dispatch DragEvent——分多步 mouse.move 正是
 * 为了让浏览器判定这是一次拖拽手势而不是一次点击。
 * @param dy 落点在目标框内的纵向比例（0 靠上、1 靠下），插入到容器中部时用 0.5。
 */
export async function dragTo(
  page: Page,
  source: Locator,
  target: Locator,
  dy = 0.5,
): Promise<void> {
  await source.scrollIntoViewIfNeeded()
  const sourceBox = await source.boundingBox()
  await target.scrollIntoViewIfNeeded()
  const targetBox = await target.boundingBox()
  if (!sourceBox || !targetBox) {
    throw new Error('拖拽源或目标元素不可见，无法取得 boundingBox（请检查选择器/滚动位置）')
  }
  await page.mouse.move(sourceBox.x + 10, sourceBox.y + Math.min(5, sourceBox.height / 2))
  await page.mouse.down()
  const targetX = targetBox.x + targetBox.width / 2
  const targetY = targetBox.y + targetBox.height * dy
  const steps = 20
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      sourceBox.x + ((targetX - sourceBox.x) * i) / steps,
      sourceBox.y + ((targetY - sourceBox.y) * i) / steps,
    )
  }
  // 库内部靠节流后的 dragover 处理器判定当前悬停的落点，最后停留一小段时间让它
  // 稳定命中目标区域再松开——这是拖拽手势本身要求的停顿，不是随意等待。
  await page.waitForTimeout(150)
  await page.mouse.up()
  // 放开后提交/插入是异步处理的（下一帧 + 状态提交），给一次很短的收尾等待；
  // 后续断言一律用 expect.poll/toBeVisible 兜底，这里不代替真正的等待条件。
  await page.waitForTimeout(150)
}

/** 从左侧面板把 `paletteLabel`（如「文本」「按钮组」）拖到 `target` 容器/画布里。 */
export async function dragPaletteItem(
  page: Page,
  tab: '字段' | '容器' | '静态',
  paletteLabel: string,
  target: Locator,
  dy = 0.5,
): Promise<void> {
  await switchPaletteTab(page, tab)
  const source = page.getByText(paletteLabel, { exact: true }).first()
  await source.waitFor({ state: 'visible' })
  await dragTo(page, source, target, dy)
}

/** 读取 localStorage 里当前的表单定义（改名同步引用等用例要读回落库的 DSL 校验）。 */
export async function readStoredDefinition(page: Page): Promise<FormDefinition> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), DEMO_STORAGE_KEY)
  if (!raw) throw new Error('localStorage 里没有找到表单定义：' + DEMO_STORAGE_KEY)
  return JSON.parse(raw) as FormDefinition
}

/** 顶栏「体检」按钮（aria-label 取自 i18n `issues.entry`）。 */
export function issuesEntryButton(page: Page): Locator {
  return page.getByRole('button', { name: '体检' })
}

/** 顶栏「历史」按钮（aria-label 取自 i18n `history.entry`）。 */
export function historyEntryButton(page: Page): Locator {
  return page.getByRole('button', { name: '历史', exact: true })
}
