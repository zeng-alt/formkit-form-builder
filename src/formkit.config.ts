// formkit.config.ts
import { defaultConfig } from '@formkit/vue'
import { createI18nPlugin, en, zh } from '@formkit/i18n'
import { rootClasses } from './formkit.theme.ts'
import { buildFormkitInputs } from './elements'
import { registerElements, type RegisterElementInput } from './plugin/register-element'

// 可注入扩展元素（FormKit input 注册需在装配插件前完成）：
// app.use(plugin, formkitConfig(elements))；BuilderProvider 的 config.elements 负责 DSL 侧，幂等。
export function formkitConfig(elements?: RegisterElementInput[]) {
  registerElements(elements)
  return defaultConfig({
    plugins: [createI18nPlugin({ en, zh })],
    locales: { en, zh },
    locale: 'zh',
    config: {
      rootClasses,
    },
    // 所有输入组件注册来自元素注册中心（src/elements/，含用户扩展）
    inputs: buildFormkitInputs(),
  })
}

export default formkitConfig()
