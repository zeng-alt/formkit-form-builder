// ═══ 测试环境预热按需加载的字段/容器组件 ══════════════════════════════════════════
// 背景：字段/容器按需加载组件（elements/component-loader.ts）用 import() 动态引入，
// 生产环境按 chunk 拆分；但在 vitest（Node 环境）下，第一次动态 import 一个 .vue
// 文件要经过真实的模块转换管线，只用 nextTick 等不到它 resolve——而仓库里已有大量
// 渲染集成测试是 mount() 后跑几次 nextTick 就断言渲染结果，不应该因为这次改造
// 集体变得不稳定，也不该反过来去改几十个既有测试文件的等待方式。
//
// 这里在每个测试文件真正开始跑之前，用一次真实的 await 把全部按需组件预加载完，
// 结果按类型缓存在 component-loader.ts 的模块级 Map 里（vitest 默认按文件隔离
// 模块注册表，这个预热和随后同一文件里的测试共享同一份缓存）。测试文件里任何触发
// 这些类型渲染的地方，命中的都是已经 resolve 过的缓存——FormRenderer 的
// preloadElementComponents 会同步判定"不用等"，不会经历一次新的动态 import，
// 既有测试沿用的几次 nextTick 断言写法不用改。
import { getAllLazyElementTypes, preloadElementComponents } from '@/elements/component-loader'

await preloadElementComponents(getAllLazyElementTypes())
