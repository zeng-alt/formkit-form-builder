// ═══ UnoCSS 生成结果体检（防 rounded-xl / rounded-full 等失效再犯）═══════════════
// 背景：uno.config.ts 默认会把声明体完全相同的选择器合并进同一条规则，例如把
// `.rounded-xl` 和 formkit.theme.ts 里的 `[&::-moz-range-track]:rounded-xl`
// 合成一条 `.rounded-xl,[&::-moz-range-track]\:rounded-xl::-moz-range-track{...}`。
// 浏览器对无法识别的厂商前缀伪元素选择器（Chrome 不认 ::-moz-*、Firefox 不认
// ::-webkit-*）的处理方式是整条规则（选择器列表里任何一项非法）全部丢弃——不是
// 只丢那一个选择器，于是 `.rounded-xl` 在全站范围内跟着失效。uno.config.ts 已经
// 显式设置 `mergeSelectors: false` 修过这个问题，这里用真实 UnoCSS 生成器 + 仓库
// 真实源码复现一遍，防止将来有人为了产物体积又把这个开关改回去。
import { describe, expect, it, beforeAll } from 'vitest'
import { createGenerator, type UnoGenerator } from 'unocss'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, extname, join } from 'node:path'
import unoConfig from '../../uno.config'

const SRC_DIR = resolve(__dirname, '../../src')

// 递归收集 src 下全部 .vue / .ts 源码文件的绝对路径（与 uno.config.ts 里
// content.pipeline.include 想覆盖的范围一致：模板 + 拼 class 字符串的 .ts 模块）。
function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      out.push(...collectSourceFiles(full))
      continue
    }
    if (extname(entry) === '.vue' || extname(entry) === '.ts') out.push(full)
  }
  return out
}

// ─── 极简 CSS 规则提取：不引入 postcss，够用即可 ────────────────────────────────
// 用 `选择器 { 声明 }` 的最内层匹配，天然跳过 @media/@keyframes 之类外层包裹
// （外层前导文本里必然还嵌着 `{`，无法被“声明体不含花括号”的这条规则整体匹配，
// 正则会继续往后找，直到定位到真正的叶子规则），不影响我们要检查的选择器列表。
interface CssRule {
  selectors: string[]
  body: string
}

function splitTopLevelSelectors(selectorText: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of selectorText) {
    if (ch === '[' || ch === '(') depth++
    if (ch === ']' || ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  if (current.trim()) parts.push(current.trim())
  return parts.filter(Boolean)
}

function extractRules(css: string): CssRule[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: CssRule[] = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(withoutComments))) {
    const selectorText = m[1]!.trim()
    const body = m[2]!.trim()
    // 只处理常规选择器规则；@keyframes 内部的 0%/100% 等百分比帧不是选择器规则，
    // 但也不会误伤——它们不含 vendor 伪元素也不在下面要查的类名单里
    if (!selectorText || selectorText.startsWith('@')) continue
    rules.push({ selectors: splitTopLevelSelectors(selectorText), body })
  }
  return rules
}

const VENDOR_PSEUDO = /::-(moz|webkit)-/

let allCss = ''
let rules: CssRule[] = []
let themeOnlyCss = ''
let vueOnlyCss = ''

beforeAll(async () => {
  const uno: UnoGenerator = await createGenerator(unoConfig)
  const files = collectSourceFiles(SRC_DIR)
  expect(files.length).toBeGreaterThan(50) // 防止目录扫描本身出错导致测试静默通过

  const codeParts: string[] = []
  const themeParts: string[] = []
  const vueParts: string[] = []
  for (const file of files) {
    const code = readFileSync(file, 'utf-8')
    codeParts.push(code)
    if (extname(file) === '.ts') themeParts.push(code)
    if (extname(file) === '.vue') vueParts.push(code)
  }

  allCss = (await uno.generate(codeParts.join('\n'), { preflights: false })).css
  rules = extractRules(allCss)

  // 只用 .ts 源码生成一份，用来单独验证 content.pipeline 确实会扫描 .ts 文件
  // （而不是只扫 .vue 模板）——text-red-500 在 formkit.theme.ts 这个纯 .ts 模块里
  // 以字符串形式拼进 class，不在任何 .vue 模板里直接出现。
  themeOnlyCss = (await uno.generate(themeParts.join('\n'), { preflights: false })).css
  vueOnlyCss = (await uno.generate(vueParts.join('\n'), { preflights: false })).css
}, 30_000)

function hasStandaloneSelector(list: CssRule[], className: string): boolean {
  const target = `.${className}`
  return list.some((r) => r.selectors.includes(target))
}

describe('uno.config.ts 生成结果体检', () => {
  it('任何一条规则都不会同时出现厂商伪元素选择器与普通选择器', () => {
    const violations = rules
      .filter((r) => r.selectors.length > 1)
      .filter((r) => {
        const hasVendor = r.selectors.some((s) => VENDOR_PSEUDO.test(s))
        const hasNormal = r.selectors.some((s) => !VENDOR_PSEUDO.test(s))
        return hasVendor && hasNormal
      })
    if (violations.length) {
      const detail = violations
        .map((v) => `  ${v.selectors.join(', ')} { ${v.body.slice(0, 80)} }`)
        .join('\n')
      throw new Error(`发现厂商伪元素选择器与普通选择器混在同一条规则里：\n${detail}`)
    }
    expect(violations).toHaveLength(0)
  })

  it.each(['rounded-xl', 'rounded-full', 'rounded-lg', 'border-solid', 'text-red-500'])(
    '%s 生成了独立的 CSS 规则',
    (className) => {
      expect(hasStandaloneSelector(rules, className)).toBe(true)
    },
  )

  it('text-red-500 能从纯 .ts 源码（formkit.theme.ts）里被扫描出来', () => {
    // 证明 uno.config.ts 里 `/\/src\/.+\.[jt]s($|\?)/` 这条 pipeline.include 规则
    // 确实覆盖了 .ts 文件——如果谁把它删掉、只保留 .vue/.jsx 那条，这里会先挂掉，
    // 而不是等到某个只在 .ts 里拼 class 的场景在页面上悄悄不生效。
    expect(hasStandaloneSelector(extractRules(themeOnlyCss), 'text-red-500')).toBe(true)
  })

  it('对照组：仅 .vue 源码单独生成时，rounded-xl 依然是独立规则（回归基线）', () => {
    // 只是记录基线，不是本文件的核心断言：即使把 .vue/.ts 分开生成，只要各自内容
    // 命中了 rounded-xl，就不应该因为拆开生成而受影响。
    expect(hasStandaloneSelector(extractRules(vueOnlyCss), 'rounded-xl')).toBe(true)
  })
})
