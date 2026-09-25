// pnpm build-only 收尾步骤：删除两次 UMD 单入口构建（umd-index / umd-renderer）
// 各自产出的临时 CSS 文件。
//
// 三次构建共用同一个 dist/：第一次（ES 多入口，index + renderer）依赖图最全，是
// 后两次单入口构建各自依赖图的超集，所以只信它产出的 builder.css；umd-index /
// umd-renderer 这两次单入口构建的 CSS 内容只是子集（renderer 尤其小，仅渲染态
// 用到的类），写到临时文件名（见 vite.config.ts 的 cssFileName）避免覆盖前面
// 已经写好的 builder.css，这里统一清掉，不让它们混进最终发布的 dist/。
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const TEMP_CSS_FILES = ['_umd-index-tmp.css', '_umd-renderer-tmp.css']

for (const name of TEMP_CSS_FILES) {
  rmSync(fileURLToPath(new URL(`../dist/${name}`, import.meta.url)), { force: true })
}
