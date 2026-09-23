import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
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
    // 默认 node：纯函数测试不需要 DOM，跑得快。需要真实 DOM 的测试文件
    // （挂载组件的渲染集成测试）在文件顶部用 `// @vitest-environment happy-dom`
    // docblock 按文件声明——vitest 5 原生支持这个机制，无需 environmentMatchGlobs。
    environment: 'node',
  },
})
