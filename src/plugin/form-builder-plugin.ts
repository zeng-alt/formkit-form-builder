import type { App, Plugin } from 'vue'
import { defaultConfig, plugin as formkitPlugin } from '@formkit/vue'
import { formkitConfig } from '@/formkit.config'
import { registerElements, type RegisterElementInput } from '@/plugin/register-element'
import { setGlobalFormBuilderConfig } from '@/composables/use-config'
import type { FormBuilderConfig } from '@/types/env'

export interface FormBuilderPluginOptions {
  /** 全局配置（apiKey / locale / messages / elements 扩展） */
  config?: FormBuilderConfig
  /** 自定义 FormKit defaultConfig 工厂；默认 formkitConfig(config.elements) */
  formkitConfig?: (elements?: RegisterElementInput[]) => ReturnType<typeof defaultConfig>
  /** 是否自动安装 FormKit 插件；应用已装过 @formkit/vue 时设 false 防重复 */
  installFormKit?: boolean
}

/**
 * 一键接入插件：安装 FormKit + 元素注册 + 全局配置一次完成。
 * 之后可直接用 `<FormBuilder :config v-model="def"/>` 与 `<FormRenderer :definition="def"/>`，
 * 无需再手动 app.use(plugin, formkitConfig()) 或套 BuilderProvider。
 */
export const FormBuilderPlugin: Plugin = {
  install(app: App, options?: FormBuilderPluginOptions) {
    const opts = options ?? {}
    const elements = opts.config?.elements

    // 元素注册（幂等）：覆盖 DSL 注册中心 + FormKit input 绑定双侧。
    registerElements(elements)

    // 全局配置回落：未套 BuilderProvider 的组件也能通过 useFormBuilderConfig 拿到 config。
    setGlobalFormBuilderConfig(opts.config)

    // FormKit 装配。@formkit/vue 的 plugin install 不可重复执行，默认自动装；
    // 应用已自行 app.use(plugin, config) 时传 installFormKit: false 跳过。
    if (opts.installFormKit !== false) {
      app.use(formkitPlugin, (opts.formkitConfig ?? formkitConfig)(elements))
    }
  },
}
