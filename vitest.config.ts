import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// 独立配置：不 import vite.config.ts——它在 serve 模式下把 root 指到 playground，
// 不适合测试运行时使用。
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
})
