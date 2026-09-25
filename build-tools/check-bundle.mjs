// ═══ 体积守护：pnpm build-only 之后跑，检查设计器首屏 / 渲染入口首屏产物 ═══════════
// 三件事：
//   1. 设计器首屏（ES 主入口 builder.es.js 及其静态依赖 chunk）里不能出现
//      @codemirror/* 的 import；
//   2. 渲染入口（renderer.es.js 及其静态依赖）里不能出现 @codemirror/*、
//      @formkit/drag-and-drop、axios；
//   3. 首屏体积预算：主入口 gzip 与 renderer gzip 各有一个上限（实测值 + 10% 余量）。
//
// "首屏"只统计静态 import 能到达的产物：从入口文件出发，只沿着顶层 `import ... from
// "./xxx.js"` 这类静态导入递归展开，遇到 `import()` 动态导入就停（那些是懒加载
// chunk，不在首屏之列，见 vite.config.ts 关于 V1 代码分割的说明）。
//
// @codemirror/* 是 external（peerDependencies），检测方式是在产物文本里找字面量的
// import 语句——bare specifier 会原样保留，不会被内联，文本匹配足够可靠。
// @formkit/drag-and-drop 和 axios 都不是 external，会被整份内联进代码，产物里不会
//留下 import 语句，只能靠 source map 的 sources 列表反查：某个 chunk 的 sources 里
// 出现了这两个包 node_modules 路径，就说明它们的代码被打进了这个 chunk。
// source map 只在 ES 主入口这一次构建里生成（vite.config.ts 的 sourcemap: isFirstPass），
// 足够覆盖这里要检查的两个 ES 产物。
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))

// 静态 import 语句：`import ... from '...'` / `import '...'`，不含 import( 动态调用。
// Rollup/rolldown 产物里的静态 import 总是独立成行、位于文件顶部，这条正则按行匹配。
const STATIC_IMPORT_RE = /^import\s+(?:[^'"()]*?from\s*)?["']([^"']+)["'];?\s*$/gm

const FORBIDDEN_EXTERNAL_PREFIXES = ['@codemirror']

/** 从一个产物文件出发，收集它通过静态 import 能到达的全部产物文件（含自身），
 *  以及沿途遇到的外部包 bare specifier（peerDependencies，如 @codemirror/*）。 */
function collectEagerGraph(entryAbsFile) {
  const visitedFiles = new Set()
  const externals = new Set()
  const queue = [entryAbsFile]
  while (queue.length) {
    const file = queue.shift()
    if (visitedFiles.has(file)) continue
    visitedFiles.add(file)
    if (!existsSync(file)) continue
    const code = readFileSync(file, 'utf8')
    for (const m of code.matchAll(STATIC_IMPORT_RE)) {
      const spec = m[1]
      if (spec.startsWith('.')) {
        const resolved = path.normalize(path.join(path.dirname(file), spec))
        if (!visitedFiles.has(resolved)) queue.push(resolved)
      } else {
        externals.add(spec)
      }
    }
  }
  return { files: [...visitedFiles], externals }
}

/** 某个产物文件对应的 source map（若存在）里，sources 列表是否命中给定的
 *  node_modules 包名（用于揪出没有被 external、已经整份内联的包）。 */
function sourceMapMentionsPackage(jsFile, packageName) {
  const mapFile = `${jsFile}.map`
  if (!existsSync(mapFile)) return false
  let map
  try {
    map = JSON.parse(readFileSync(mapFile, 'utf8'))
  } catch {
    return false
  }
  const needle = new RegExp(`/node_modules/${packageName}/`)
  return (map.sources ?? []).some((s) => needle.test(s))
}

function gzipSize(file) {
  return zlib.gzipSync(readFileSync(file)).length
}

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`
}

// ─── 体积预算：实测值 + 10% 余量（见报告里的实测体积表，构建输出会打印当前实测值）──
// 主入口（设计器首屏，ES）：gzip 实测 172.2KB（176364 字节）→ 上限 190KB
// renderer 入口（渲染首屏，ES）：gzip 实测 79.1KB（80950 字节）→ 上限 87KB
const BUDGETS = {
  designer: 190 * 1024,
  renderer: 87 * 1024,
}

function checkEntry(name, entryFile, forbiddenPackages, budgetBytes) {
  const problems = []
  if (!existsSync(entryFile)) {
    problems.push(`找不到入口产物：${path.relative(DIST, entryFile)}（先跑 pnpm build-only）`)
    return { problems, gzipTotal: 0 }
  }

  const { files, externals } = collectEagerGraph(entryFile)

  // 1) @codemirror/* 之类的 external 包不能出现在静态依赖里
  for (const ext of externals) {
    if (FORBIDDEN_EXTERNAL_PREFIXES.some((p) => ext === p || ext.startsWith(`${p}/`))) {
      problems.push(`${name} 首屏静态依赖里出现了被禁止的 import："${ext}"`)
    }
  }

  // 2) 已内联的包（@formkit/drag-and-drop、axios）只能靠 source map 反查
  for (const pkg of forbiddenPackages) {
    const hitFile = files.find((f) => sourceMapMentionsPackage(f, pkg))
    if (hitFile) {
      problems.push(`${name} 首屏静态依赖里混入了 "${pkg}" 的代码：${path.relative(DIST, hitFile)}`)
    }
  }

  // 3) 体积预算
  let gzipTotal = 0
  const breakdown = []
  for (const f of files) {
    const size = gzipSize(f)
    gzipTotal += size
    breakdown.push([path.relative(DIST, f), size])
  }
  console.log(`\n[check:bundle] ${name} 首屏静态依赖（gzip 合计 ${fmtKB(gzipTotal)}）：`)
  for (const [f, size] of breakdown.sort((a, b) => b[1] - a[1])) {
    console.log(`  ${fmtKB(size).padStart(9)}  ${f}`)
  }
  if (gzipTotal > budgetBytes) {
    problems.push(
      `${name} 首屏 gzip 合计 ${fmtKB(gzipTotal)} 超出预算 ${fmtKB(budgetBytes)}（实测值 + 10% 余量）`,
    )
  }

  return { problems, gzipTotal }
}

const designer = checkEntry(
  '设计器主入口 builder.es.js',
  path.join(DIST, 'builder.es.js'),
  // 注意：@formkit/drag-and-drop 是画布拖拽的合法依赖，设计器首屏本就需要，不禁止；
  // axios 则任何首屏都不该有——用到 http 时才应该 await import('axios')。
  ['axios'],
  BUDGETS.designer,
)
const renderer = checkEntry(
  '渲染入口 renderer.es.js',
  path.join(DIST, 'renderer.es.js'),
  ['@formkit/drag-and-drop', 'axios'],
  BUDGETS.renderer,
)

const allProblems = [...designer.problems, ...renderer.problems]
if (allProblems.length) {
  console.error('\n[check:bundle] 检查未通过：')
  for (const p of allProblems) console.error(`  - ${p}`)
  process.exit(1)
}

console.log(
  '\n[check:bundle] 通过：设计器首屏 / 渲染入口首屏均未混入 CodeMirror / 拖拽库 / axios，体积在预算内。',
)
