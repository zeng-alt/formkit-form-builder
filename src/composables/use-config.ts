import { inject, provide, type InjectionKey } from 'vue'
import type { FormBuilderConfig } from '../types/env'

export const CONFIG_KEY: InjectionKey<FormBuilderConfig> = Symbol('configKey')

// 插件级全局配置（FormBuilderPlugin install 时设置）。
// BuilderProvider / FormBuilder 显式 provide 时覆盖；未 provide 时回落到这里。
let globalConfig: FormBuilderConfig = {}

export function setGlobalFormBuilderConfig(config?: FormBuilderConfig) {
  if (config) globalConfig = config
}

export function provideFormBuilderConfig(config: FormBuilderConfig) {
  provide(CONFIG_KEY, config)
}

export function useFormBuilderConfig(): FormBuilderConfig {
  return inject(CONFIG_KEY, globalConfig)
}
