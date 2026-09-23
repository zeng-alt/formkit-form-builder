// ═══ .vue 组件导入：本地名必须与文件名一致 ═══════════════════════════════════════
// 仓库约定：导入 .vue 组件时，本地变量名与文件名相同（import Foo from './Foo.vue'）。
// 曾出现 `import LabelHelpSection from '../common/NaiveBasicSection.vue'`：名字看起来
// 对，指向的却是另一个组件，模板里的 <LabelHelpSection /> 实际渲染了一个不带参数、
// 因而什么都不显示的 NaiveBasicSection——头像编辑面板的「标签 / 帮助」配置区一直是空的，
// 而类型检查、lint 与既有测试都发现不了。这条测试把约定固定下来。
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// 有意的例外：对外公开名与内部文件名不同
const ALLOWED: Record<string, string> = {
  // src/index.ts 以 FormBuilder 作为公共组件名导出设计器主组件
  FormBuilder: 'BuilderMain',
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(p)
    return /\.(vue|ts)$/.test(e.name) ? [p] : []
  })
}

describe('.vue 组件导入命名', () => {
  const files = walk('src')
  const mismatches: string[] = []
  let checked = 0
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    // 只认行首的 import 语句，避免把注释里引用的示例文本当成真实导入
    for (const m of src.matchAll(/^import\s+([A-Z][A-Za-z0-9]*)\s+from\s+'([^']+\.vue)'/gm)) {
      checked++
      const [, local, spec] = m
      const base = path.basename(spec!, '.vue')
      if (local !== base && ALLOWED[local!] !== base) {
        mismatches.push(`${file}: import ${local} from '${spec}'（文件名为 ${base}）`)
      }
    }
  }

  it('解析器健全性：至少扫描到一定数量的 .vue 导入', () => {
    // 若源码格式变化导致正则什么都匹配不到，这条会失败，而不是让下面那条空跑通过
    expect(checked).toBeGreaterThan(100)
  })

  it('每个 .vue 导入的本地名都与文件名一致（或在例外表中）', () => {
    expect(mismatches).toEqual([])
  })
})
