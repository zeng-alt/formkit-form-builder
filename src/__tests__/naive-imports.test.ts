// ═══ naive-ui 组件必须显式导入 ═══════════════════════════════════════════════════
// 仓库不使用 unplugin-vue-components 自动解析组件：它只在构建期生效，测试环境不走它，
// 依赖它的组件在测试里只会渲染成未知元素，测到的就不是真实行为。而去掉插件后，漏写
// 导入不会让构建失败，只会在运行时报一条 "Failed to resolve component" 警告——很容易
// 被忽略。这条测试保证模板里用到的每个 naive-ui 组件都在同文件内显式导入。
//
// Vue 的 <script setup> 模板编译器会把 kebab 标签（<n-card>）解析到同文件的 PascalCase
// 绑定（NCard）上，所以两种写法都按 PascalCase 名比对。
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : e.name.endsWith('.vue') ? [p] : []
  })
}

const toPascal = (kebab: string) =>
  kebab
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')

describe('naive-ui 组件显式导入', () => {
  const missing: string[] = []
  let tagCount = 0
  for (const file of walk('src')) {
    const src = fs.readFileSync(file, 'utf8')
    const tplStart = src.indexOf('<template>')
    if (tplStart < 0) continue
    const tpl = src.slice(tplStart)
    const used = new Set<string>()
    for (const m of tpl.matchAll(/<(n-[a-z][a-z-]*)\b/g)) used.add(toPascal(m[1]!))
    for (const m of tpl.matchAll(/<(N[A-Z][A-Za-z0-9]*)\b/g)) used.add(m[1]!)
    tagCount += used.size
    const imported = new Set(
      [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'naive-ui'/g)].flatMap((m) =>
        m[1]!
          .split(',')
          .map(
            (x) =>
              x
                .trim()
                .split(/\s+as\s+/)
                .pop()!,
          )
          .filter(Boolean),
      ),
    )
    for (const name of used)
      if (!imported.has(name)) missing.push(`${file}: <${name}> 未从 naive-ui 导入`)
  }

  it('解析器健全性：至少扫描到一定数量的 naive-ui 组件用法', () => {
    expect(tagCount).toBeGreaterThan(100)
  })

  it('模板中用到的每个 naive-ui 组件都在同文件内显式导入', () => {
    expect(missing).toEqual([])
  })
})
