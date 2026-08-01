import type { RegisterElementInput } from '../plugin/register-element'

export interface FormBuilderConfig {
  apiKey?: string
  locale?: string
  messages?: Record<string, any>
  /** 扩展元素（配置式注册：DSL + FormKit input + 容器画布/预览 一次打通） */
  elements?: RegisterElementInput[]
}
