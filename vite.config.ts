import { fileURLToPath, URL } from "node:url";
import { readFileSync } from "node:fs";

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
// 单次构建（vite build）同时产出 ES + UMD，仅外部化 peerDependencies，
// 其余依赖全部打进包内。
const src = (...paths: string[]) =>
  fileURLToPath(new URL(paths.join("/"), import.meta.url));

// package.json 的 peerDependencies 是"由使用者提供、库不打包"的单一真源。
// external / UMD globals 都从这里派生，不再手写第二份清单——历史教训：
// external 曾手写只列了 3 个包，peerDependencies 里另外 8 个 @codemirror/*
// （以及后续加入的 @formkit/core、@formkit/vue、@formkit/i18n）被漏掉，
// 结果这些包被整份内联进产物，与使用者项目里的那份形成两个运行时实例
// （FormKit 的节点/插件注册表互不相认、CodeMirror 对多实例有主动检测会直接报错）。
const pkgJson = JSON.parse(
  readFileSync(src("package.json"), "utf-8"),
) as { peerDependencies?: Record<string, string> };
const peerNames = Object.keys(pkgJson.peerDependencies ?? {});

// peer 包名 -> UMD 全局变量名，同样从这一份清单生成 external 正则和 output.globals，
// 避免出现"外部化了但 UMD 找不到全局变量"的半吊子状态。
const PEER_GLOBALS: Record<string, string> = {
  vue: "Vue",
  "naive-ui": "naiveUi",
  "@vueuse/core": "VueUse",
  "@formkit/core": "FormKitCore",
  "@formkit/vue": "FormKitVue",
  "@formkit/i18n": "FormKitI18n",
  "@codemirror/autocomplete": "CM.autocomplete",
  "@codemirror/commands": "CM.commands",
  "@codemirror/lang-javascript": "CM.langJavascript",
  "@codemirror/language": "CM.language",
  "@codemirror/lint": "CM.lint",
  "@codemirror/state": "CM.state",
  "@codemirror/theme-one-dark": "CM.themeOneDark",
  "@codemirror/view": "CM.view",
};

for (const name of peerNames) {
  if (!(name in PEER_GLOBALS)) {
    throw new Error(
      `vite.config.ts: peerDependencies 新增了 "${name}"，但 PEER_GLOBALS 里缺少对应的 ` +
        "UMD 全局变量名映射，请补上（否则 UMD 产物里这个包外部化后运行时会找不到全局变量）。",
    );
  }
}

// external 用函数式写法（而非字符串数组）：需要同时匹配包名本身
// （如 "@codemirror/state"）和它的子路径导入（如 "@codemirror/state/xxx"），
// 字符串数组只能精确匹配裸包名，覆盖不到子路径 import。
const peerExternalPattern = new RegExp(
  `^(${peerNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(/.*)?$`,
);
const isPeerDependency = (id: string) => peerExternalPattern.test(id);

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
            // 与 peerDependencies 保持一致（见上方 isPeerDependency），ES/UMD
            // 均外部化运行时共享依赖：
            // - vue / naive-ui / @vueuse/core：常规 UI 层 peer；
            // - @formkit/core / @formkit/vue / @formkit/i18n：必须与使用者项目
            //   共用同一份 FormKit 运行时，否则节点注册表、插件、locale 互不相认；
            // - @codemirror/*（8 个）：CodeMirror 对多份 @codemirror/state 实例
            //   有主动检测，混入会直接报错。
            // 注意 @formkit/drag-and-drop 不在其列、有意继续内联打包：它只是纯拖拽
            // 工具函数，不持有跨实例共享的注册表，内联没有上述危害，还能省得使用者
            // 多装一个包。
            external: isPeerDependency,
            output: {
              exports: "named",
              globals: PEER_GLOBALS,
              // 库内大量 `editor: () => import(...)` 懒加载，默认会按组件切成几十个 chunk。
              // 这里强制全部内联进单文件，产物只剩 builder.es.js / builder.umd.js。
              // （rolldown 已弃用 inlineDynamicImports，等价选项为 codeSplitting: false）
              codeSplitting: false,
            },
          },
        }
      : undefined,
  };
});
