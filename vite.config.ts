import { fileURLToPath, URL } from "node:url";

import { defineConfig, type UserConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vueDevTools from "vite-plugin-vue-devtools";
import UnoCSS from "unocss/vite";
import dts from "vite-plugin-dts";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";

// 传统单文件产物：builder.es.js + builder.umd.js + index.d.ts + builder.css。
// 单次构建（vite build）同时产出 ES + UMD，仅外部化 peerDependencies
// （vue / naive-ui / @vueuse/core），其余依赖全部打进包内。
const src = (...paths: string[]) =>
  fileURLToPath(new URL(paths.join("/"), import.meta.url));

export default defineConfig(({ command }): UserConfig => {
  const isBuild = command === "build";

  return {
    root: command === "serve" ? src("playground") : undefined,
    publicDir: command === "serve" ? src("public") : false,
    plugins: [
      AutoImport({}),
      Components({
        dirs: [],
        dts: false,
        resolvers: [NaiveUiResolver()],
      }),
      UnoCSS(),
      vue(),
      vueJsx(),
      vueDevTools(),
      isBuild
        ? dts({
            tsconfigPath: src("tsconfig.build.json"),
            // 把所有 .d.ts 打包成单个 dist/index.d.ts
            rollupTypes: true,
            cleanVueFileName: true,
          })
        : undefined,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": src("src"),
        // playground 以真实发布包名引包，验证发布后的引包路径与 README 示例一致
        "@zeng-alt/formkit-form-builder": src("src/index.ts"),
      },
    },
    build: isBuild
      ? {
          // lightningcss 会把 w-[80%] 这类 UnoCSS 任意值类名里的 [80%] 误解析为属性选择器而报错
          // （既有问题，影响所有 w-[NN%] 安全列表类），改用 esbuild 压缩 CSS。
          cssMinify: "esbuild",
          lib: {
            entry: src("src/index.ts"),
            name: "FormKitFormBuilder",
            cssFileName: "builder",
            // 单次构建按 format 产出 builder.es.js / builder.umd.js
            fileName: (format) => `builder.${format}.js`,
          },
          rollupOptions: {
            // 与 peerDependencies 保持一致，ES/UMD 均外部化运行时共享依赖，
            // 避免打包进两份 Vue / naive-ui / @vueuse/core。
            external: ["vue", "naive-ui", "@vueuse/core"],
            output: {
              exports: "named",
              globals: {
                vue: "Vue",
                "naive-ui": "naiveUi",
                "@vueuse/core": "VueUse",
              },
              // 库内大量 `editor: () => import(...)` 懒加载，默认会按组件切成几十个 chunk。
              // 这里强制全部内联进单文件，产物只剩 builder.es.js / builder.umd.js。
              inlineDynamicImports: true,
            },
          },
        }
      : undefined,
  };
});
