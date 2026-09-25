import { fileURLToPath, URL } from 'node:url'
import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// 独立配置：不 import vite.config.ts——它在 serve 模式下把 root 指到 playground，
// 不适合测试运行时使用。
export default defineConfig({
  plugins: [
    // 渲染集成测试要真的挂载 .vue 组件（FormRenderer 等），需要这个插件转译 SFC；
    // 纯函数级测试不引用 .vue 文件，不受影响。
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    // include 本身已经把范围锁在 src/ 下，e2e/**（Playwright 用例）不会被匹配到；
    // 这里再显式排除一遍，避免以后有人放宽 include 时把 e2e 的 *.spec.ts 误吸进来——
    // 两套测试的运行方式（vitest run / playwright test）和运行环境完全不同，不能混跑。
    exclude: [...configDefaults.exclude, 'e2e/**'],
    // 默认 node：纯函数测试不需要 DOM，跑得快。需要真实 DOM 的测试文件
    // （挂载组件的渲染集成测试）在文件顶部用 `// @vitest-environment happy-dom`
    // docblock 按文件声明——vitest 5 原生支持这个机制，无需 environmentMatchGlobs。
    environment: 'node',
    // 按需加载字段/容器组件（elements/component-loader.ts）预热，避免真实的动态
    // import 让既有渲染集成测试的 nextTick 断言变得不稳定，见该文件顶部注释。
    setupFiles: ['src/test-setup/preload-lazy-elements.ts'],
  },
})
