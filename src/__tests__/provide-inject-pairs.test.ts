// ═══ provide/inject 配对守卫 ════════════════════════════════════════════════
// 静态扫描 src/**/*.{ts,vue}（跳过 __tests__），收集所有 provide(KEY, ...) 与
// inject(KEY, ...) / inject<...>(KEY, ...) 调用的键（KEY 可能是字符串字面量，也
// 可能是模块内定义的 InjectionKey 常量标识符），断言：
//   - 每个 provide 的键都至少被 inject 过一次（否则就是永远没人读的死 provide，
//     参见 FormRenderer.vue 曾经的 previewListDuplicate / previewListIsLast /
//     previewListRemove / previewListRestore）；
//   - 每个 inject 的键都能在仓库里找到对应的 provide（第三方库自己提供、我们
//     只 inject 的键除外，显式列入下面的白名单并注明来源）。
// 这里只做文本层面的粗略匹配，不解析类型/作用域，足以防止「provide 了没人用」
// 「inject 了没人给」这类死代码或笔误继续潜伏。
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full)
    return /\.(vue|ts)$/.test(entry.name) ? [full] : []
  })
}

/**
 * inject 可能带泛型：`inject<Ref<Record<string, unknown>> | null>(KEY, ...)`。
 * 从 `inject` 之后的位置开始，若紧跟 `<` 则按括号深度找到与之匹配的 `>`，
 * 跳过整段泛型子句，返回其后的位置；不是 `<` 开头则原样返回 idx。
 */
function skipGenericClause(src: string, idx: number): number {
  let i = idx
  while (i < src.length && /\s/.test(src[i]!)) i++
  if (src[i] !== '<') return idx
  let depth = 0
  for (; i < src.length; i++) {
    if (src[i] === '<') depth++
    else if (src[i] === '>') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return idx
}

/** 从 `(` 之后的位置解析第一个实参：字符串字面量原样返回（含引号），标识符返回其名字 */
function parseKeyArg(src: string, idx: number): string | null {
  let i = idx
  while (i < src.length && /\s/.test(src[i]!)) i++
  const quote = src[i]
  if (quote === "'" || quote === '"') {
    let j = i + 1
    while (j < src.length && src[j] !== quote) j++
    return src.slice(i, j + 1)
  }
  const rest = src.slice(i)
  const m = /^[A-Za-z_$][\w$]*/.exec(rest)
  return m ? m[0] : null
}

type Occurrence = { key: string; file: string }

function scan(files: string[]): { provides: Occurrence[]; injects: Occurrence[] } {
  const provides: Occurrence[] = []
  const injects: Occurrence[] = []
  const callRe = /\b(provide|inject)\b/g
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    const rel = path.relative(process.cwd(), file)
    callRe.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = callRe.exec(src))) {
      const kind = m[1] as 'provide' | 'inject'
      let i = callRe.lastIndex
      if (kind === 'inject') i = skipGenericClause(src, i)
      while (i < src.length && /\s/.test(src[i]!)) i++
      if (src[i] !== '(') continue
      const key = parseKeyArg(src, i + 1)
      if (!key) continue
      ;(kind === 'provide' ? provides : injects).push({ key, file: rel })
    }
  }
  return { provides, injects }
}

// 目前仓库里没有「只 inject、由第三方库自己 provide」的键——所有 inject 都能在
// src 内找到对应的 provide。若以后接入这类键，加到这里并注明来源，避免被
// 误判为死 inject（同时也失去了对真正死代码的检测能力，添加前请再三确认）。
const THIRD_PARTY_PROVIDED_KEYS: string[] = []

const files = walk('src')
const { provides, injects } = scan(files)

describe('provide/inject 配对守卫', () => {
  it('健康检查：扫到足够数量的 provide / inject 调用（防止空扫描恒通过）', () => {
    expect(provides.length).toBeGreaterThanOrEqual(10)
    expect(injects.length).toBeGreaterThanOrEqual(10)
  })

  it('每个 provide 的键都至少被 inject 一次', () => {
    const injectedKeys = new Set(injects.map((o) => o.key))
    const deadProvides = provides
      .filter((o) => !injectedKeys.has(o.key))
      .map((o) => `${o.key}（${o.file}）`)
    expect(deadProvides).toEqual([])
  })

  it('每个 inject 的键都有对应的 provide（第三方白名单键除外）', () => {
    const providedKeys = new Set(provides.map((o) => o.key))
    const orphanInjects = injects
      .filter((o) => !providedKeys.has(o.key) && !THIRD_PARTY_PROVIDED_KEYS.includes(o.key))
      .map((o) => `${o.key}（${o.file}）`)
    expect(orphanInjects).toEqual([])
  })
})
