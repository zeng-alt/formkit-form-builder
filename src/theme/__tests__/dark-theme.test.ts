// ═══ 暗色主题组件清单守护 ═══════════════════════════════════════════════════════
// builderDarkTheme（src/theme/dark-theme.ts）只组合本库实际用到的组件的暗色主题，
// 清单必须和仓库里实际 import 的 naive-ui 组件保持一致：漏掉一个，它在暗色下就会
// 显示成亮色（读不到对应的 xxxDark，会退回组件内置的 light 默认值）。
// 这份测试扫描 src/** 里所有从 naive-ui 具名导入的组件（含 useMessage /
// useNotification），把每个组件映射到它在 naive-ui 内部对应的主题 key（即
// createTheme 用到的 name），再逐个断言 builderDarkTheme 上存在这个 key。
// 新增一个之前没用过的 naive-ui 组件时，这份测试会先失败，提示去补 THEME_KEY_BY_COMPONENT
// 与 dark-theme.ts 两处。
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { builderDarkTheme } from '@/theme/dark-theme'

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : e.name.endsWith('.ts') || e.name.endsWith('.vue') ? [p] : []
  })
}

// N 组件 / composable 名 -> naive-ui 内部主题 key（createTheme(componentThemes) 用
// cTheme.name 当 key，与这里的值一一对应）。子组件不单独调用 useTheme、共用父组件
// 主题的（排版类、CheckboxGroup、RadioButton/RadioGroup、CollapseItem、LayoutSider、
// TabPane、Step、UploadDragger……），映射到同一个 key。纯结构组件（不消费主题）映射
// 为空字符串，不需要在 builderDarkTheme 里出现。
const THEME_KEY_BY_COMPONENT: Record<string, string> = {
  NA: 'Typography',
  NAlert: 'Alert',
  NAutoComplete: 'AutoComplete',
  NAvatar: 'Avatar',
  NBackTop: 'BackTop',
  NBadge: 'Badge',
  NBlockquote: 'Typography',
  NButton: 'Button',
  NButtonGroup: '',
  NCard: 'Card',
  NCascader: 'Cascader',
  NCheckbox: 'Checkbox',
  NCheckboxGroup: 'Checkbox',
  NCollapse: 'Collapse',
  NCollapseItem: 'Collapse',
  NColorPicker: 'ColorPicker',
  NConfigProvider: '',
  NDataTable: 'DataTable',
  NDatePicker: 'DatePicker',
  NDivider: 'Divider',
  NDropdown: 'Dropdown',
  NDynamicTags: 'DynamicTags',
  NEmpty: 'Empty',
  NH1: 'Typography',
  NH2: 'Typography',
  NH3: 'Typography',
  NH4: 'Typography',
  NH5: 'Typography',
  NH6: 'Typography',
  NImage: 'Image',
  NInput: 'Input',
  NInputGroup: '',
  NInputNumber: 'InputNumber',
  NLayout: 'Layout',
  NLayoutSider: 'Layout',
  NLi: 'Typography',
  NMention: 'Mention',
  NMessageProvider: 'Message',
  NModal: 'Modal',
  NNotificationProvider: 'Notification',
  NOl: 'Typography',
  NP: 'Typography',
  NPagination: 'Pagination',
  NPopconfirm: 'Popconfirm',
  NPopover: 'Popover',
  NPopselect: 'Popselect',
  NProgress: 'Progress',
  NQrCode: 'QrCode',
  NRadio: 'Radio',
  NRadioButton: 'Radio',
  NRadioGroup: 'Radio',
  NRate: 'Rate',
  NScrollbar: 'Scrollbar',
  NSelect: 'Select',
  NSlider: 'Slider',
  NSpace: 'Space',
  NSpin: 'Spin',
  NStep: 'Steps',
  NSteps: 'Steps',
  NSwitch: 'Switch',
  NTabPane: 'Tabs',
  NTabs: 'Tabs',
  NTag: 'Tag',
  NText: 'Typography',
  NTimePicker: 'TimePicker',
  NTooltip: 'Tooltip',
  NTransfer: 'Transfer',
  NTree: 'Tree',
  NTreeSelect: 'TreeSelect',
  NUl: 'Typography',
  NUpload: 'Upload',
  NUploadDragger: 'Upload',
  useMessage: 'Message',
  useNotification: 'Notification',
}

// 非组件 / 非主题相关的具名导出：类型、locale 数据、以及 use-builder-theme.ts 自己
// 维护的 darkTheme（已改名为 builderDarkTheme，不再从 naive-ui 导入）。扫描到这些
// 名字直接跳过，不需要主题 key。
const IGNORED = new Set([
  'darkTheme',
  'lightTheme',
  'createTheme',
  'dateEnUS',
  'dateZhCN',
  'enUS',
  'zhCN',
])

/** 提取一段源码里所有从 naive-ui 具名导入（非 type-only）的标识符。 */
function extractNaiveUiValueImports(src: string): string[] {
  const names: string[] = []
  const re = /import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]naive-ui['"]/gs
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    if (m[1]) continue // import type { ... } from 'naive-ui'：类型导入，跳过
    for (let part of m[2]!.split(',')) {
      part = part.trim()
      if (!part || part.startsWith('type ')) continue
      const name = part.split(/\s+as\s+/)[0]!.trim()
      if (name) names.push(name)
    }
  }
  return names
}

describe('暗色主题组件清单（builderDarkTheme）', () => {
  const used = new Set<string>()
  for (const file of walk('src')) {
    // 主题清单本身、以及从子路径深度 import 的 dark-theme.ts 不计入「组件用法」扫描。
    if (file === path.join('src', 'theme', 'dark-theme.ts')) continue
    for (const name of extractNaiveUiValueImports(fs.readFileSync(file, 'utf8'))) {
      if (IGNORED.has(name)) continue
      used.add(name)
    }
  }

  it('解析器健全性：至少扫描到一定数量的 naive-ui 组件 / composable 用法', () => {
    expect(used.size).toBeGreaterThan(40)
  })

  it('扫描到的每个组件在映射表里都有对应的主题 key', () => {
    const unknown = [...used].filter((name) => !(name in THEME_KEY_BY_COMPONENT))
    expect(unknown).toEqual([])
  })

  it('每个用到的组件，它的暗色主题都在 builderDarkTheme 清单里', () => {
    const theme = builderDarkTheme as unknown as Record<string, unknown>
    const missing: string[] = []
    for (const name of used) {
      const key = THEME_KEY_BY_COMPONENT[name]
      if (!key) continue // 纯结构组件，不消费主题
      if (!theme[key]) missing.push(`${name} -> ${key}`)
    }
    expect(missing).toEqual([])
  })
})
