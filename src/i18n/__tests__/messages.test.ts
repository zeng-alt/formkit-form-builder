// ═══ 国际化文案：中英键集合一致，且代码引用的键两边都存在 ═══════════════════════
// 缺失的键不会报任何错：t() 按「当前语言 → 回退语言（默认 zh-CN）→ en」逐级回退，
// 英文缺一个键，英文界面就悄悄显示成中文；两边都缺则直接显示键名。曾有
// formSettings.id / formSettings.version 只写了中文，英文界面下显示为「表单 ID」「版本」。
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import zh from '@/i18n/zh'
import en from '@/i18n/en'

function flatten(obj: Record<string, unknown>, prefix = '', out = new Set<string>()): Set<string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v as Record<string, unknown>, key, out)
    else out.add(key)
  }
  return out
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p)
    return /\.(vue|ts)$/.test(e.name) ? [p] : []
  })
}

const ZH = flatten(zh as Record<string, unknown>)
const EN = flatten(en as Record<string, unknown>)

// 代码里静态引用的键：t('a.b.c') 以及元素目录里的 xxxKey: 'a.b.c'。
// 动态拼接的键（t(`edits.pickerType.${v}`)）无法静态解析，由下面单独的用例覆盖。
function referencedKeys(): Map<string, string> {
  const used = new Map<string, string>()
  for (const file of walk('src')) {
    const src = fs.readFileSync(file, 'utf8')
    for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.set(m[1]!, file)
    for (const m of src.matchAll(
      /(?:nameKey|labelKey|placeholderKey|helpKey|descriptionKey|tooltipKey):\s*'([a-zA-Z0-9_.]+)'/g,
    ))
      used.set(m[1]!, file)
  }
  return used
}

describe('国际化文案', () => {
  it('中英文案的键集合完全一致', () => {
    expect([...ZH].filter((k) => !EN.has(k))).toEqual([])
    expect([...EN].filter((k) => !ZH.has(k))).toEqual([])
  })

  it('代码中静态引用的每个键在中英文案里都存在', () => {
    const used = referencedKeys()
    // 健全性：解析器若因源码格式变化什么都没抓到，这条会失败而不是空跑通过
    expect(used.size).toBeGreaterThan(300)
    const missing = [...used]
      .filter(([k]) => !ZH.has(k) || !EN.has(k))
      .map(([k, f]) => `${k}（${f}）缺失：${[!ZH.has(k) && 'zh', !EN.has(k) && 'en'].filter(Boolean).join(' / ')}`)
    expect(missing).toEqual([])
  })

  it('日期选择器类型的动态键 edits.pickerType.* 在中英文案里都存在', () => {
    // 与 DateLikeEditor.vue / DateTimeEditor.vue 中的取值列表保持一致
    const values = ['date', 'datetime', 'daterange', 'datetimerange', 'month', 'monthrange', 'year', 'yearrange', 'quarter', 'quarterrange', 'week']
    for (const file of ['DateLikeEditor.vue', 'DateTimeEditor.vue']) {
      const src = fs.readFileSync(`src/components/sidebar-right/edits/editors/${file}`, 'utf8')
      for (const v of values) expect(src, `${file} 的取值列表与本测试不一致`).toContain(`'${v}'`)
    }
    for (const v of values) {
      expect(ZH.has(`edits.pickerType.${v}`), `zh 缺失 edits.pickerType.${v}`).toBe(true)
      expect(EN.has(`edits.pickerType.${v}`), `en 缺失 edits.pickerType.${v}`).toBe(true)
    }
  })
})
