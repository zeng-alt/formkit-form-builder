import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

import { defineConfig, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'
import dts from 'vite-plugin-dts'

// 两套产物：
//   1) 设计器 + 渲染器合一的传统单文件产物：builder.es.js（保留代码分割）+
//      builder.umd.js（单文件）+ index.d.ts + builder.css；
//   2) 只含运行时渲染能力的 renderer.es.js / renderer.umd.js + renderer-entry.d.ts
//      （对外导入路径 @zeng-alt/formkit-form-builder/renderer）。
// ES 产物需要保留代码分割（首屏之外的弹窗/面板/CodeMirror 懒加载 chunk），UMD 必须
// 单文件——Vite 的 lib 模式一次构建里所有 format 共用同一份 output 配置，没法
// "ES 分割、UMD 内联"混着来，也没法在 UMD 单入口里塞两个不同的 name 全局变量，
// 所以按 mode 拆成三次 vite build 链式跑（见 package.json 的 build-only 脚本）：
//   默认 mode（生产默认）→ ES 多入口（index + renderer），保留代码分割 + 打类型声明；
//   umd-index    → 单入口 UMD，产出 builder.umd.js；
//   umd-renderer → 单入口 UMD，产出 renderer.umd.js。
// 三次都写向同一个 dist/：第 2、3 次不清空目录（emptyOutDir:false）；CSS 只信第一次
// （多入口 ES 覆盖了 index 的完整依赖图，是三者中的超集），后两次的 CSS 产物改名成
// 临时文件，构建脚本收尾时删掉，避免 renderer 单入口（依赖图更小）的 CSS 覆盖掉
// 完整的 builder.css。
const src = (...paths: string[]) => fileURLToPath(new URL(paths.join('/'), import.meta.url))

// package.json 的 peerDependencies 是"由使用者提供、库不打包"的单一真源。
// external / UMD globals 都从这里派生，不再手写第二份清单——历史教训：
// external 曾手写只列了 3 个包，peerDependencies 里另外 8 个 @codemirror/*
// （以及后续加入的 @formkit/core、@formkit/vue、@formkit/i18n）被漏掉，
// 结果这些包被整份内联进产物，与使用者项目里的那份形成两个运行时实例
// （FormKit 的节点/插件注册表互不相认、CodeMirror 对多实例有主动检测会直接报错）。
const pkgJson = JSON.parse(readFileSync(src('package.json'), 'utf-8')) as {
  peerDependencies?: Record<string, string>
}
const peerNames = Object.keys(pkgJson.peerDependencies ?? {})

// peer 包名 -> UMD 全局变量名，同样从这一份清单生成 external 正则和 output.globals，
// 避免出现"外部化了但 UMD 找不到全局变量"的半吊子状态。
const PEER_GLOBALS: Record<string, string> = {
  vue: 'Vue',
  'naive-ui': 'naiveUi',
  '@vueuse/core': 'VueUse',
  '@formkit/core': 'FormKitCore',
  '@formkit/vue': 'FormKitVue',
  '@formkit/i18n': 'FormKitI18n',
  '@codemirror/autocomplete': 'CM.autocomplete',
  '@codemirror/commands': 'CM.commands',
  '@codemirror/lang-javascript': 'CM.langJavascript',
  '@codemirror/language': 'CM.language',
  '@codemirror/lint': 'CM.lint',
  '@codemirror/state': 'CM.state',
  '@codemirror/theme-one-dark': 'CM.themeOneDark',
  '@codemirror/view': 'CM.view',
}

for (const name of peerNames) {
  if (!(name in PEER_GLOBALS)) {
    throw new Error(
      `vite.config.ts: peerDependencies 新增了 "${name}"，但 PEER_GLOBALS 里缺少对应的 ` +
        'UMD 全局变量名映射，请补上（否则 UMD 产物里这个包外部化后运行时会找不到全局变量）。',
    )
  }
}

// external 用函数式写法（而非字符串数组）：需要同时匹配包名本身
// （如 "@codemirror/state"）和它的子路径导入（如 "@codemirror/state/xxx"），
// 字符串数组只能精确匹配裸包名，覆盖不到子路径 import。
const peerExternalPattern = new RegExp(
  `^(${peerNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(/.*)?$`,
)
const isPeerDependency = (id: string) => peerExternalPattern.test(id)

// naive-ui 的 ColorPicker / Image / QrCode 暗色主题没有从包顶层导出（见
// src/theme/dark-theme.ts 顶部注释），只能从子路径深度 import。ES 产物按惯例把
// naive-ui 整体外部化没问题——使用方自己的构建工具能按同样的子路径解析到它们装的
// naive-ui；但 UMD 单文件产物运行时只有 naive-ui 顶层导出对应的一个全局变量，没有
// 这三个子路径的全局变量可外部化。umd-index / umd-renderer 两个模式下用下面的
// naiveUiDeepStyleAlias 把这三个子路径顶替成 build-tools/naive-deep-theme-shim.ts
// （从已外部化的 darkTheme 顶层导出取字段），见该 shim 文件顶部注释。
const NAIVE_UI_DEEP_STYLE_PATHS = [
  'naive-ui/es/color-picker/styles',
  'naive-ui/es/image/styles',
  'naive-ui/es/qr-code/styles',
]
const naiveUiDeepStyleAlias = Object.fromEntries(
  NAIVE_UI_DEEP_STYLE_PATHS.map((p) => [p, src('build-tools/naive-deep-theme-shim.ts')]),
)

const ENTRIES = {
  index: src('src/index.ts'),
  renderer: src('src/renderer-entry.ts'),
}

type LibPass = 'es' | 'umd-index' | 'umd-renderer'

export default defineConfig(({ command, mode }): UserConfig => {
  const isBuild = command === 'build'
  const pass: LibPass = mode === 'umd-index' || mode === 'umd-renderer' ? mode : 'es'
  // 只有第一次（ES 多入口）跑类型声明 / 清空 dist：后两次是同一个 dist 上的追加构建
  const isFirstPass = pass === 'es'

  return {
    root: command === 'serve' ? src('playground') : undefined,
    publicDir: command === 'serve' ? src('public') : false,
    // 不使用 unplugin-vue-components / unplugin-auto-import：naive-ui 组件一律在
    // <script setup> 里显式导入。自动解析只在构建期生效，测试环境（vitest.config.ts）
    // 不走它，依赖它的组件在测试里会渲染成未知元素——测到的就不是真实行为。
    plugins: [
      UnoCSS(),
      vue(),
      vueJsx(),
      vueDevTools(),
      isBuild && isFirstPass
        ? dts({
            tsconfigPath: src('tsconfig.build.json'),
            // 把每个入口各自的 .d.ts 打包成一个文件（index.d.ts / renderer.d.ts，
            // 后者对应 renderer-entry.ts，文件名取自 lib.entry 的 key 而非源文件名）
            rollupTypes: true,
            cleanVueFileName: true,
          })
        : undefined,
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': src('src'),
        // playground 以真实发布包名引包，验证发布后的引包路径与 README 示例一致；
        // 更具体的 /renderer 子路径别名必须排在前面，否则会先命中不带子路径的那条
        '@zeng-alt/formkit-form-builder/renderer': src('src/renderer-entry.ts'),
        '@zeng-alt/formkit-form-builder': src('src/index.ts'),
        // 只在 UMD 两个模式下生效，见 naiveUiDeepStyleAlias 定义处的注释
        ...(pass === 'es' ? undefined : naiveUiDeepStyleAlias),
      },
    },
    build: isBuild
      ? {
          // lightningcss 会把 w-[80%] 这类 UnoCSS 任意值类名里的 [80%] 误解析为属性选择器而报错
          // （既有问题，影响所有 w-[NN%] 安全列表类），改用 esbuild 压缩 CSS。
          cssMinify: 'esbuild',
          // 保留代码分割时，懒加载组件（弹窗/面板/CodeMirror）各自的 <style> 默认会
          // 被切到各自的 CSS 文件里；这里强制合并回一份，使用方的 builder.css 导入
          // 路径不用因为这次改造而跟着变。
          cssCodeSplit: false,
          emptyOutDir: isFirstPass,
          // ES 多入口这一次带 sourcemap，供 build-tools/check-bundle.mjs 用 source map
          // 把产物字节映射回原始源文件，判断懒加载 chunk 之外是否混入了不该有的依赖；
          // UMD 单文件产物本身不参与这个检查，不需要 sourcemap。
          sourcemap: isFirstPass,
          lib:
            pass === 'es'
              ? {
                  entry: ENTRIES,
                  name: 'FormKitFormBuilder',
                  cssFileName: 'builder',
                  formats: ['es'],
                  fileName: (format, entryName) =>
                    entryName === 'index' ? `builder.${format}.js` : `${entryName}.${format}.js`,
                }
              : {
                  entry: pass === 'umd-index' ? ENTRIES.index : ENTRIES.renderer,
                  name: pass === 'umd-index' ? 'FormKitFormBuilder' : 'FormKitFormBuilderRenderer',
                  // umd-index / umd-renderer 只依赖图不同，各自算出来的 CSS 内容
                  // 是 builder.css 的子集（renderer 尤其小），写到临时文件名，
                  // 避免覆盖第一次（ES 多入口，依赖图最全）产出的 builder.css，
                  // package.json 的 build-only 脚本收尾时把这两个临时文件删掉。
                  cssFileName: pass === 'umd-index' ? '_umd-index-tmp' : '_umd-renderer-tmp',
                  formats: ['umd'],
                  fileName: () => (pass === 'umd-index' ? 'builder.umd.js' : 'renderer.umd.js'),
                },
          rollupOptions: {
            // 与 peerDependencies 保持一致（见上方 isPeerDependency），ES/UMD
            // 均外部化运行时共享依赖：
            // - vue / naive-ui / @vueuse/core：常规 UI 层 peer；
            // - @formkit/core / @formkit/vue / @formkit/i18n：必须与使用者项目
            //   共用同一份 FormKit 运行时，否则节点注册表、插件、locale 互不相认；
            // - @codemirror/*（8 个）：CodeMirror 对多份 @codemirror/state 实例
            //   有主动检测，混入会直接报错。
            // 注意 @formkit/drag-and-drop 不在其列、有意继续内联打包：它只是纯拖拽
            // 工具函数，不持有跨实例共享的注册表，内联没有上述危害，还能省得使用者
            // 多装一个包（渲染入口不引用它所在的画布代码，因此也不会内联进 renderer 产物）。
            // Rollup 在调用任何 resolveId 插件（含下面 resolve.alias）之前就先决定
            // external，所以这三个子路径要在这里单独排除，跳过外部化，才能让
            // resolve.alias 把它们顶替成 build-tools/naive-deep-theme-shim.ts。
            external: (id: string) =>
              isPeerDependency(id) && (pass === 'es' || !NAIVE_UI_DEEP_STYLE_PATHS.includes(id)),
            output: {
              exports: 'named',
              globals: PEER_GLOBALS,
              ...(pass === 'es'
                ? {
                    // ES 保留真正的代码分割：懒加载组件各自成 chunk，统一放进
                    // dist/chunks/ 子目录，与两个入口文件分开，文件名带 hash。
                    chunkFileNames: 'chunks/[name]-[hash].js',
                    // axios 只应出现在"用到 http 时才 await import('axios')"的懒加载
                    // chunk 里（见 use-bind-http.ts）。但默认分包会按"哪些动态入口能
                    // 到达这个模块"分组，恰好一个内部通用的模块命名空间小 helper也只
                    // 被同一批懒加载入口用到，会被打包器归进同一个物理 chunk——
                    // BuilderPreview（src/index.ts 同步导出，走的是设计器首屏静态
                    // 依赖）恰好静态引用了那个 helper，等于把整个 axios chunk 也拖
                    // 进首屏。强制 axios 单独成 chunk，切断这条连带关系。
                    manualChunks(id: string) {
                      if (/[\\/]node_modules[\\/]axios[\\/]/.test(id)) return 'axios'
                    },
                  }
                : // UMD 单入口不支持真正的多 chunk 产物，強制内联所有动态 import。
                  // （rolldown 已弃用 inlineDynamicImports，等价选项为 codeSplitting: false）
                  { codeSplitting: false }),
            },
          },
        }
      : undefined,
  }
})
