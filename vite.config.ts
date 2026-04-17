import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'
import dts from 'vite-plugin-dts'

export default defineConfig(({ command }) => ({
  root: command === 'serve' ? fileURLToPath(new URL('./playground', import.meta.url)) : undefined,
  publicDir:
    command === 'serve' ? fileURLToPath(new URL('./public', import.meta.url)) : false,
  plugins: [
    UnoCSS(),
    vue(),
    vueJsx(),
    vueDevTools(),
    command === 'build'
      ? dts({
          tsconfigPath: fileURLToPath(new URL('./tsconfig.build.json', import.meta.url)),
          entryRoot: fileURLToPath(new URL('./src', import.meta.url)),
          outDir: fileURLToPath(new URL('./dist', import.meta.url)),
          insertTypesEntry: true,
          copyDtsFiles: false,
          cleanVueFileName: true,
        })
      : undefined,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build:
    command === 'build'
      ? {
          lib: {
            entry: {
              index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
              style: fileURLToPath(new URL('./src/style-entry.ts', import.meta.url)),
            },
            name: 'FormKitFormBuilder',
            cssFileName: 'style',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => {
              if (entryName === 'style') return format === 'es' ? 'style.mjs' : 'style.cjs'
              return format === 'es' ? 'index.mjs' : 'index.cjs'
            },
          },
          rollupOptions: {
            external: [
              'vue',
              '@formkit/core',
              'naive-ui',
              '@vueuse/core',
              'vue-sonner',
              'openai',
            ],
            output: {
              globals: {
                vue: 'Vue',
              },
            },
          },
        }
      : undefined,
}))
