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

// ─── FormKit pseudoProps：会被拦截、绝不会流入 context.attrs / props 透传包的键 ──
// 来源：@formkit/vue useInput.ts（当前安装版本见下方健全性断言里读取的 package.json）。
// 命中这张表的键，即使渲染组件里的 naive-ui 组件声明了同名 prop 也收不到值——因为
// v-bind="props" 透传的是 useSchemaAttrs 镜像的 context.attrs，而这些键从一开始就没
// 进 context.attrs（被 FormKit 在 useInput 里 only(nodeProps(context.attrs), pseudoProps)
// 摘走了，改落进 context.<key> 或 context.node.props.<key>）。渲染组件必须显式读取
// 这个位置并自己转发，不能指望"naive-ui 组件声明了这个 prop"就万事大吉。
const pseudoProps: Array<string | RegExp> = [
  // Boolean props
  'ignore',
  'disabled',
  'preserve',
  // String props
  'help',
  'label',
  /^preserve(-e|E)rrors/,
  /^[a-z]+(?:-visibility|Visibility|-behavior|Behavior)$/,
  /^[a-zA-Z-]+(?:-class|Class)$/,
  'prefixIcon',
  'suffixIcon',
  /^[a-zA-Z-]+(?:-icon|Icon)$/,
]
const isPseudoProp = (key: string) =>
  pseudoProps.some((p) => (typeof p === 'string' ? p === key : p.test(key)))

// ─── 类型 → 渲染组件：解析 src/elements/formkit.ts 的绑定表 ─────────────────────
// 依赖约定：`import Xxx from '<path>.vue'` + `type: { component: Xxx, ... }`
// （对象字面量整行，形如 `  color: { component: NaiveColorPicker, ... },`）。
// X：按需加载的类型（日期/数据表格列表编辑器等）不再直接 import 组件，而是写成
// `type: { component: createLazyComponent('type'), ... }`（见 elements/formkit.ts
// 顶部说明），底层组件文件改从 elements/component-loader.ts 的加载器表按类型查。
// 大部分类型按"用途相近"分组合并成一个 chunk（elements/lazy-groups/*.ts 的桶文件，
// 见 component-loader.ts 顶部说明），加载器写成
// `type: () => xFamily().then((m) => ({ default: m.Xxx }))`；少数体积大、用途独立的
// 类型（富文本/签名）仍是 `type: () => import('<path>.vue')` 直接引用。
function parseLazyLoaderFiles(): Record<string, string> {
  const src = read(abs('src/elements/component-loader.ts'))
  const map: Record<string, string> = {}
  // 直接引用（未分组）
  for (const m of src.matchAll(/^\s*(\w+): \(\) => import\('([^']+\.vue)'\),?\s*$/gm)) {
    const [, type, filePath] = m
    if (!type || !filePath) continue
    map[type] = resolveAlias(filePath)
  }
  // 分组桶文件：先从每个 lazy-groups/*.ts 建 "组件标识符 → 文件路径"
  const groupDir = abs('src/elements/lazy-groups')
  const identifierToFile: Record<string, string> = {}
  if (fs.existsSync(groupDir)) {
    for (const name of fs.readdirSync(groupDir)) {
      if (!name.endsWith('.ts')) continue
      const groupSrc = read(path.join(groupDir, name))
      for (const m of groupSrc.matchAll(/export \{ default as (\w+) \} from '([^']+\.vue)'/g)) {
        const [, identifier, filePath] = m
        if (!identifier || !filePath) continue
        identifierToFile[identifier] = resolveAlias(filePath)
      }
    }
  }
  // 再解析 component-loader.ts 里 `type: () => xFamily().then((m) => ({ default: m.Xxx }))`
  for (const m of src.matchAll(
    /^\s*(\w+): \(\) => \w+\(\)\.then\(\(m\) => \(\{ default: m\.(\w+) \}\)\),?\s*$/gm,
  )) {
    const [, type, identifier] = m
    if (!type || !identifier) continue
    const file = identifierToFile[identifier]
    if (file) map[type] = file
  }
  return map
}

function parseTypeComponent(): Record<string, string> {
  const src = read(abs('src/elements/formkit.ts'))
  const importOf: Record<string, string> = {}
  for (const m of src.matchAll(/import (\w+) from '([^']+\.vue)'/g)) {
    const [, localName, filePath] = m
    if (!localName || !filePath) continue
    importOf[localName] = resolveAlias(filePath)
  }
  const typeComp: Record<string, string> = {}
  for (const m of src.matchAll(/^\s*(\w+): \{ component: (\w+),/gm)) {
    const [, type, comp] = m
    if (!type || !comp) continue
    const file = importOf[comp]
    if (file) typeComp[type] = file
  }
  const lazyFile = parseLazyLoaderFiles()
  for (const m of src.matchAll(/^\s*(\w+): \{\s*component: createLazyComponent\('(\w+)'\)/gm)) {
    const [, type, lazyType] = m
    if (!type || !lazyType) continue
    const file = lazyFile[lazyType]
    if (file) typeComp[type] = file
  }
  return typeComp
}

// ─── 类型 → 编辑器：解析 src/elements/definitions/editor-bindings.ts ────────────
// 依赖约定：右侧属性面板的编辑器组件不再内联写在 elements/definitions/{fields,
// containers,static}.ts 的元素定义对象里（渲染入口也要用这些定义，内联的
// `editor: () => import(...)` 会被 UMD 单文件产物强制内联，把编辑器 UI 和它们的
// CodeMirror 依赖一起带进渲染入口，见 dsl/registry.ts 的 setElementEditors 与
// elements/definitions/editor-bindings.ts 顶部说明）。这些编辑器绑定集中放在
// editor-bindings.ts 里，形如 `  <type>: () => import('<path>.vue'),` 的扁平映射。
function parseTypeEditor(): Record<string, string> {
  const src = read(abs('src/elements/definitions/editor-bindings.ts'))
  const typeEditor: Record<string, string> = {}
  for (const m of src.matchAll(/^\s*(\w+): \(\) => import\('([^']+)'\),?\s*$/gm)) {
    const [, type, filePath] = m
    if (!type || !filePath) continue
    typeEditor[type] ??= resolveAlias(filePath)
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
// - createDisabledProp()（无参数）是 disabled 键专用的写路径（关闭开关时删键而非
//   写 false，见 form-fields.ts 注释），键名固定是 'disabled'，不经字符串字面量传参，
//   下面 WRITE_RE 匹配不到普通模式，单独把它计成写入了 'disabled'。
// - 子区块里被 `v-if="props.K"` 守着的开关，只有父编辑器在 <Child :K="true" ...>
//   上传了 K，才算这个类型真的写入了该键（比如 NaiveBasicSection 的 clearable
//   开关，只有 FileEditor 传了 :clearable="true" 才算 file 类型写入了 clearable）。
function editorKeys(
  file: string,
  seen = new Set<string>(),
  passedFlags: Set<string> | null = null,
): Set<string> {
  if (!fs.existsSync(file)) return new Set()
  const src = read(file)
  const keys = new Set<string>()
  const gated = new Set([...src.matchAll(/v-if="props\.(\w+)"/g)].map((m) => m[1]))
  const WRITE_RE = /(?:createPropsProp|setPropsProp|createButtonProp)(?:<[^>]*>)?\(\s*'([^']+)'/g
  for (const m of src.matchAll(WRITE_RE)) {
    const key = m[1]
    if (!key) continue
    if (passedFlags && gated.has(key) && !passedFlags.has(key)) continue
    keys.add(key)
  }
  if (/createDisabledProp\(\)/.test(src)) {
    if (!(passedFlags && gated.has('disabled') && !passedFlags.has('disabled')))
      keys.add('disabled')
  }
  for (const m of src.matchAll(/import (\w+) from '(\.{1,2}\/[^']+\.vue)'/g)) {
    const [, localName, relPath] = m
    if (!localName || !relPath) continue
    const child = path.join(path.dirname(file), relPath)
    // 去重键必须带上本地名：同一父文件可能以不同名字导入同一个子组件，每个名字在模板里
    // 传的开关参数不同，只按「子文件 + 父文件」去重会让第二个名字的参数被静默跳过
    const seenKey = `${child}|${file}|${localName}`
    if (seen.has(seenKey)) continue
    seen.add(seenKey)
    // 父模板里 <Child ...> 标签上出现的属性名（kebab-case 转 camelCase），
    // 用来判断子区块里被 v-if="props.K" 守着的开关这次有没有被传入
    const flags = new Set<string>()
    for (const tag of src.matchAll(new RegExp(`<${localName}\\b([^>]*)>`, 'g'))) {
      const attrsText = tag[1]
      if (!attrsText) continue
      for (const attr of attrsText.matchAll(/(?:^|\s)[:@]?([a-zA-Z][\w-]*)/g)) {
        const name = attr[1]
        if (!name) continue
        flags.add(name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))
      }
    }
    for (const key of editorKeys(child, seen, flags)) keys.add(key)
  }
  return keys
}

// ─── 渲染组件实际消费的键 ────────────────────────────────────────────────────────
// 依赖约定：
// - `<N大写开头组件>` 标签视为渲染了对应的 naive-ui 组件，该组件运行时声明的每个
//   prop 都算"被消费"（组件用 v-bind="props" 之类整体透传，不会逐个具名接住）——
//   但这一条对命中 pseudoProps 的键不成立：这些键根本不在透传的 props 里，naive-ui
//   组件声明了同名 prop 也白搭，必须显式读取才算数（见下方 declared / read 的拆分）
// - 组件自己按名读取配置也算数：config.xxx / props.xxx / attrs.xxx / context.xxx，
//   以及 config['xxx'] 这种括号写法——这条对 pseudoProps 键同样成立且是唯一途径
function consumedKeys(file: string): { declared: Set<string>; read: Set<string> } {
  const src = read(file)
  const declared = new Set<string>()
  const readKeys = new Set<string>()
  for (const m of src.matchAll(/<(N[A-Z][A-Za-z0-9]*)\b/g)) {
    const compName = m[1]
    if (!compName) continue
    for (const key of Object.keys(naive[compName]?.props ?? {})) declared.add(key)
  }
  for (const m of src.matchAll(/(?:config|props|attrs|context)\??\.([a-zA-Z_]\w*)/g)) {
    if (m[1]) readKeys.add(m[1])
  }
  for (const m of src.matchAll(/config\[['"](\w+)['"]\]/g)) {
    if (m[1]) readKeys.add(m[1])
  }
  // useSchemaAttrs() 统一算出的 disabled 等值：解构出的变量名与它代表的配置键同名
  // （约定见 use-schema-attrs.ts），把它当作显式读取——否则组件复用这个composable
  // 转发 disabled（而不是每处重复写 context.disabled 字面量）时会被误判成"没人消费"。
  for (const m of src.matchAll(/const \{([^}]*)\} = useSchemaAttrs\(/g)) {
    const group = m[1]
    if (!group) continue
    for (const ident of group.split(',')) {
      const name = ident.trim()
      if (name) readKeys.add(name)
    }
  }
  return { declared, read: readKeys }
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
    reason:
      'NaiveTypographyA.vue 根元素就是原生 <a>，href 直接透传到 $attrs 生效，不经任何 naive-ui 组件',
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
      // 上一行已断言 ed 非空，这里是运行时已验证过的非空场景
      const keys = editorKeys(ed!)
      expect(
        keys.size,
        `类型 ${type} 解析出的编辑器键数 (${[...keys].join(',')})`,
      ).toBeGreaterThanOrEqual(min)
    }
  })

  // 健全性：pseudoProps 表必须还是我们复制的这份——FormKit 升级后如果这张表变了
  // （新增/删除条目），上面这份手抄副本可能已经不准确，得先手动同步再让测试继续信它
  it('健全性：@formkit/vue 安装版本里的 pseudoProps 仍包含我们抄的这些字面量', () => {
    const pkgPath = require.resolve('@formkit/vue/package.json')
    const pkg = require('@formkit/vue/package.json') as { version: string }
    const distPath = path.join(path.dirname(pkgPath), 'dist/index.mjs')
    const src = read(distPath)

    expect(src, `@formkit/vue 版本 ${pkg.version} 的 dist 文件里`).toContain('var pseudoProps = [')
    for (const literal of ['"ignore"', '"disabled"', '"preserve"', '"help"', '"label"']) {
      expect(src, `pseudoProps 里应仍有 ${literal}（@formkit/vue ${pkg.version}）`).toContain(
        literal,
      )
    }
    // icon 正则的关键片段（-icon|Icon）：这是 showIcon 之类键被拦截的直接依据
    expect(src, `pseudoProps 的 icon 正则片段（@formkit/vue ${pkg.version}）`).toContain(
      '-icon|Icon',
    )
  })

  const types = Object.keys(typeComp).sort()
  it.each(types)('%s：编辑器写入的每个键都被渲染组件消费', (type) => {
    const editorFile = typeEditor[type]
    const compFile = typeComp[type]
    // 没有编辑器（如工厂函数生成的 naiveH1~H6，type 是模板字符串，正则识别不了）
    // 的类型跳过——与人工审计脚本原行为一致，已经算进上面健全性断言的下限余量里
    if (!editorFile || !compFile) return

    const keys = editorKeys(editorFile)
    const { declared, read } = consumedKeys(compFile)
    const compBasename = path.basename(compFile)
    const passthrough = new Set(HTML_PASSTHROUGH[compBasename] ?? [])

    // pseudoProp 命中的键只认"组件显式读取"，naive-ui 组件声明了同名 prop 不算数
    // （见 consumedKeys 顶部注释、pseudoProps 顶部注释）
    const isConsumed = (key: string) => read.has(key) || (!isPseudoProp(key) && declared.has(key))

    const bad = [...keys].filter(
      (key) =>
        !isConsumed(key) &&
        !SHELL_KEYS.has(key) &&
        !passthrough.has(key) &&
        !exemptionSet.has(`${type}\u0000${key}`),
    )

    expect(
      bad,
      bad
        .map((key) =>
          isPseudoProp(key)
            ? `「${type}」的编辑器 ${path.basename(editorFile)} 写入了 ${key}，这个键命中 FormKit ` +
              `pseudoProps 规则会被拦截（见文件顶部 pseudoProps 表），不会流入 ${compBasename} ` +
              `透传的 props，必须显式读取 context.${key}（或 FormKit 实际存放它的位置）并转发给 ` +
              `底层 naive-ui 组件`
            : `「${type}」的编辑器 ${path.basename(editorFile)} 写入了 ${key}，但它渲染的 ` +
              `${compBasename} 里没有任何组件消费它（检查该组件模板里的 naive-ui 组件是否声明了 ` +
              `${key} 这个 prop，或组件自己是否该读一下 config.${key}）`,
        )
        .join('\n'),
    ).toEqual([])
  })
})
