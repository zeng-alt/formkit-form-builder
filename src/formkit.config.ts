// formkit.config.ts
import { defaultConfig } from '@formkit/vue'
import { createI18nPlugin, en, zh } from '@formkit/i18n'
import { rootClasses } from './formkit.theme.ts'
import { buildFormkitInputs } from './elements'

export default defaultConfig({
  plugins: [createI18nPlugin({ en, zh })],
  locales: { en, zh },
  locale: 'zh',
  config: {
    rootClasses,
  },
  // 所有输入组件注册来自元素注册中心（src/elements/）
  inputs: buildFormkitInputs(),
})
