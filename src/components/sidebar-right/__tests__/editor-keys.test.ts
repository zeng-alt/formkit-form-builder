// ═══ 回归测试：编辑面板开关必须真的有效 ═══════════════════════════════════════════
// 背景：编辑面板的每个开关最终都是 createPropsProp('key', ...) 把值写进节点
// props；渲染时字段组件（src/components/ui/fields/*.vue）经 useSchemaAttrs 把它
// v-bind 到 naive-ui 组件上。如果 naive-ui 组件没有声明这个 prop，值就只会透传成
// 根元素上一个无意义的 HTML 属性——开关看起来能拨，实际什么都不做。
// 这类"开关写了但没人接"的 bug 这几轮已经在段落（主题/对齐）、颜色/文件（clearable）、
// 滑块（size）、评分（disabled）等处反复出现，是会反复出现的模式，因此把人工审计脚本
// 移植成这份回归测试，覆盖 src/elements/formkit.ts 绑定表里的每一种元素类型。
//
// 本文件只依赖 fs 读源码文本做静态分析（vitest 默认 node 环境，不需要 DOM/挂载）。
// 这意味着它依赖一些源码书写约定，一旦这些约定变了但测试逻辑没跟着改，解析器可能
// 什么都抓不到却仍然"全绿"——文件末尾的健全性断言就是防这个的：断言解析出的类型数
// 与关键类型的键数都不低于一个保守下限，而不是只看有没有违规。
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = process.cwd()
const abs = (p: string) => path.join(ROOT, p)
const read = (p: string) => fs.readFileSync(p, 'utf8')
// DSL 里的 import 路径用 '@/xxx' 别名，源码文件系统路径用 'src/xxx'
const resolveAlias = (spec: string) => spec.replace(/^@\//, 'src/')

// naive-ui 各组件运行时声明的 props（用于判定"这个键是不是 naive-ui 组件真的认识的
// prop"，而不是凭记忆猜）
const naive = require('naive-ui') as Record<string, { props?: Record<string, unknown> }>

// ─── 类型 → 渲染组件：解析 src/elements/formkit.ts 的绑定表 ─────────────────────
// 依赖约定：`import Xxx from '<path>.vue'` + `type: { component: Xxx, ... }`
// （对象字面量整行，形如 `  color: { component: NaiveColorPicker, ... },`）
function parseTypeComponent(): Record<string, string> {
  const src = read(abs('src/elements/formkit.ts'))
  const importOf: Record<string, string> = {}
  for (const m of src.matchAll(/import (\w+) from '([^']+\.vue)'/g)) {
    importOf[m[1]] = resolveAlias(m[2])
  }
  const typeComp: Record<string, string> = {}
  for (const m of src.matchAll(/^\s*(\w+): \{ component: (\w+),/gm)) {
    if (importOf[m[2]]) typeComp[m[1]] = importOf[m[2]]
  }
  return typeComp
}

// ─── 类型 → 编辑器：解析 src/elements/definitions/*.ts ──────────────────────────
// 依赖约定：同一个元素定义对象字面量里，`type: '<type>',` 与
// `editor: () => import('<path>.vue')` 同时出现（顺序不限，用非贪婪 [\s\S]*? 跨行匹配）。
// 注意：用工厂函数生成的定义（如 naiveH1~H6 的 `type: \`naiveH${depth}\`` 模板字符串）
// 不会被这条正则命中，会被静默跳过——与人工审计脚本的原行为一致，健全性断言里已经
// 把这批已知会跳过的类型算进下限的余量。
function parseTypeEditor(): Record<string, string> {
  const dir = abs('src/elements/definitions')
  const typeEditor: Record<string, string> = {}
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.ts')) continue
    const src = read(path.join(dir, f))
    for (const m of src.matchAll(/type: '(\w+)',[\s\S]*?editor: \(\) => import\('([^']+)'\)/g)) {
      typeEditor[m[1]] ??= resolveAlias(m[2])
    }
  }
  return typeEditor
}

// ─── 编辑器写入的配置键（递归展开引用的 common/*.vue 子区块）───────────────────
// 依赖约定：
// - 写入路径只有 createPropsProp('key', ...) / setPropsProp('key', ...)（字段级）
//   与 createButtonProp('key', ...)（按钮级，NaiveButtonEditor/SubmitEditor 用的
//   同名写入路径，见 composables/form-fields.ts：两者都是 setPropsProp 的薄包装，
//   只是换了个语义化的名字）——人工审计脚本漏掉了 createButtonProp，导致
//   naiveButton/submit/reset 这三个类型此前被静默跳过（0 个键，从未真正被审计过）。
// - 子区块里被 `v-if="props.K"` 守着的开关，只有父编辑器在 <Child :K="true" ...>
//   上传了 K，才算这个类型真的写入了该键（比如 NaiveBasicSection 的 clearable
//   开关，只有 FileEditor 传了 :clearable="true" 才算 file 类型写入了 clearable）。
function editorKeys(file: string, seen = new Set<string>(), passedFlags: Set<string> | null = null): Set<string> {
  if (!fs.existsSync(file)) return new Set()
  const src = read(file)
  const keys = new Set<string>()
  const gated = new Set([...src.matchAll(/v-if="props\.(\w+)"/g)].map((m) => m[1]))
  const WRITE_RE = /(?:createPropsProp|setPropsProp|createButtonProp)(?:<[^>]*>)?\(\s*'([^']+)'/g
  for (const m of src.matchAll(WRITE_RE)) {
    const key = m[1]
    if (passedFlags && gated.has(key) && !passedFlags.has(key)) continue
    keys.add(key)
  }
  for (const m of src.matchAll(/import (\w+) from '(\.{1,2}\/[^']+\.vue)'/g)) {
    const child = path.join(path.dirname(file), m[2])
    const seenKey = `${child}|${file}`
    if (seen.has(seenKey)) continue
    seen.add(seenKey)
    // 父模板里 <Child ...> 标签上出现的属性名（kebab-case 转 camelCase），
    // 用来判断子区块里被 v-if="props.K" 守着的开关这次有没有被传入
    const flags = new Set<string>()
    for (const tag of src.matchAll(new RegExp(`<${m[1]}\\b([^>]*)>`, 'g'))) {
      for (const attr of tag[1].matchAll(/(?:^|\s)[:@]?([a-zA-Z][\w-]*)/g)) {
        flags.add(attr[1].replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))
      }
    }
    for (const key of editorKeys(child, seen, flags)) keys.add(key)
  }
  return keys
}

// ─── 渲染组件实际消费的键 ────────────────────────────────────────────────────────
// 依赖约定：
// - `<N大写开头组件>` 标签视为渲染了对应的 naive-ui 组件，该组件运行时声明的每个
//   prop 都算"被消费"（组件用 v-bind="props" 之类整体透传，不会逐个具名接住）
// - 组件自己按名读取配置也算数：config.xxx / props.xxx / attrs.xxx / context.xxx，
//   以及 config['xxx'] 这种括号写法
function consumedKeys(file: string): Set<string> {
  const src = read(file)
  const used = new Set<string>()
  for (const m of src.matchAll(/<(N[A-Z][A-Za-z0-9]*)\b/g)) {
    for (const key of Object.keys(naive[m[1]]?.props ?? {})) used.add(key)
  }
  for (const m of src.matchAll(/(?:config|props|attrs|context)\??\.([a-zA-Z_]\w*)/g)) used.add(m[1])
  for (const m of src.matchAll(/config\[['"](\w+)['"]\]/g)) used.add(m[1])
  return used
}

// FormKit 外壳 / DSL 层直接消费的语义键，不经 naive-ui 组件之手
const SHELL_KEYS = new Set([
  'name',
  'label',
  'help',
  'validation',
  'outerClass',
  '__bind',
  '__attrs',
  'value',
  'options',
  'id',
])

// 逐条列出的豁免：静态分析必然覆盖不到的个例，每条都写明原因，绝不用宽泛规则打包放过
interface Exemption {
  type: string
  key: string
  reason: string
}
const EXEMPTIONS: Exemption[] = [
  {
    type: 'naiveA',
    key: 'href',
    reason: 'NaiveTypographyA.vue 根元素就是原生 <a>，href 直接透传到 $attrs 生效，不经任何 naive-ui 组件',
  },
  {
    type: 'naiveA',
    key: 'target',
    reason: '同上，target 同样落在 <a> 原生属性上',
  },
  {
    type: 'time',
    key: 'pickerType',
    reason:
      'DateLikeEditor.vue 里 pickerType 开关只在 v-if="currentFieldType === \'date\'" 下渲染，' +
      'time 字段的编辑面板根本看不到它——这是静态正则识别不了运行时 v-if 分支条件的已知误报，' +
      '不是真的未消费（真正生效的 time 专属格式键是 valueFormat）',
  },
]
const exemptionSet = new Set(EXEMPTIONS.map((e) => `${e.type}\u0000${e.key}`))

// 透传到原生元素上确实生效的 HTML 属性：按渲染组件文件名精确列出，不做宽泛豁免
const HTML_PASSTHROUGH: Record<string, string[]> = {
  'NaiveTypographyA.vue': ['href', 'target'],
}

describe('编辑面板开关 → 渲染组件：每个写入的配置键都必须有人消费', () => {
  const typeComp = parseTypeComponent()
  const typeEditor = parseTypeEditor()

  // 健全性断言放最前面：如果源码书写约定变了导致上面两个解析器什么都没抓到，
  // 这里必须先炸，而不是让下面的主断言在空集合上"全绿"通过
  it('健全性：解析器至少认出这么多类型，且关键类型至少解析出这么多编辑器键', () => {
    const typeCount = Object.keys(typeComp).length
    expect(typeCount).toBeGreaterThanOrEqual(40)

    const resolvable = Object.keys(typeComp).filter((t) => typeEditor[t])
    expect(resolvable.length).toBeGreaterThanOrEqual(35)

    // 挑几个已知键很多的代表类型做下限锚点：一旦递归展开子区块的逻辑失效
    // （比如 common/*.vue 的相对路径匹配规则变了），这几个类型的键数会断崖式下跌，
    // 比只看"类型总数"更早发现解析器已经失效
    const CANARY_MIN_KEYS: Record<string, number> = {
      text: 10, // TextLikeEditor 引用 NaiveBasicSection 等多个子区块，键数最多
      naiveRate: 3,
      select: 4,
      naiveButton: 5, // createButtonProp 写入路径，验证没有把它漏解析成 0
    }
    for (const [type, min] of Object.entries(CANARY_MIN_KEYS)) {
      const ed = typeEditor[type]
      expect(ed, `类型 ${type} 应能解析出编辑器路径`).toBeTruthy()
      const keys = editorKeys(ed)
      expect(keys.size, `类型 ${type} 解析出的编辑器键数 (${[...keys].join(',')})`).toBeGreaterThanOrEqual(min)
    }
  })

  const types = Object.keys(typeComp).sort()
  it.each(types)('%s：编辑器写入的每个键都被渲染组件消费', (type) => {
    const editorFile = typeEditor[type]
    const compFile = typeComp[type]
    // 没有编辑器（如工厂函数生成的 naiveH1~H6，type 是模板字符串，正则识别不了）
    // 的类型跳过——与人工审计脚本原行为一致，已经算进上面健全性断言的下限余量里
    if (!editorFile || !compFile) return

    const keys = editorKeys(editorFile)
    const used = consumedKeys(compFile)
    const compBasename = path.basename(compFile)
    const passthrough = new Set(HTML_PASSTHROUGH[compBasename] ?? [])

    const bad = [...keys].filter(
      (key) =>
        !used.has(key) &&
        !SHELL_KEYS.has(key) &&
        !passthrough.has(key) &&
        !exemptionSet.has(`${type}\u0000${key}`),
    )

    expect(
      bad,
      bad
        .map(
          (key) =>
            `「${type}」的编辑器 ${path.basename(editorFile)} 写入了 ${key}，但它渲染的 ` +
            `${compBasename} 里没有任何组件消费它（检查该组件模板里的 naive-ui 组件是否声明了 ` +
            `${key} 这个 prop，或组件自己是否该读一下 config.${key}）`,
        )
        .join('\n'),
    ).toEqual([])
  })
})
