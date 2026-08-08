<script setup lang="ts">
import { computed, watch } from 'vue'
import type { ConfigProviderProps } from 'naive-ui'
import { provideFormBuilderConfig } from '../composables/use-config'
import type { FormBuilderConfig } from '../types/env'
import { registerElements } from '../plugin/register-element'
import { provideRuntimeLocale } from '../i18n/runtime-locale'
import { provideFormBuilderI18n } from '../i18n/context'
import { provideBinderHttp } from '../composables/use-bind-http'
import BuilderThemeScope from '../theme/BuilderThemeScope.vue'
import type { BuilderTheme } from '@/types/theme'

/**
 * 全局配置提供者：作为唯一的 n-config-provider（主题）来源。
 * 主题 + 其余 ConfigProviderProps（themeOverrides / breakpoints 等）在此统一控制，
 * 子树内的 FormBuilder / FormRenderer 继承（多实例时主题一致）。
 * 缺省 theme 由 useColorMode() 决定（含 ThemeSwitcher / 系统偏好）。
 */
const props = defineProps<{
  config: FormBuilderConfig
  /** 自定义主题：内部映射到 naive-ui 的 darkTheme / lightTheme；缺省自动跟随系统 */
  theme?: BuilderTheme
  themeOverrides?: ConfigProviderProps['themeOverrides']
  breakpoints?: ConfigProviderProps['breakpoints']
  clsPrefix?: string
  inlineThemeDisabled?: boolean
  preflightStyleDisabled?: boolean
}>()

// 配置式元素注册：挂载前打通 DSL 注册表 / FormKit input / 容器画布（幂等）
registerElements(props.config.elements)

provideFormBuilderConfig(props.config)

// 子树内所有 JS 绑定（字段事件 / 数据表格远程）使用 config.http，缺省内置 axios
provideBinderHttp(computed(() => props.config.http))

// 为 Provider 子树提供运行时代码（对齐 FormBuilder）：子树内的 FormRenderer
// 等消费方通过 useRuntimeLocale() 读取 config.locale，缺省 zh-CN。
const availableLocales = props.config.availableLocales ?? ['zh-CN', 'en']
const localeFallback = props.config.localeFallback ?? 'zh-CN'
const initialLocale = availableLocales.includes(props.config.locale ?? '')
  ? props.config.locale!
  : localeFallback

const runtimeLocale = provideRuntimeLocale({
  initialLocale,
  availableLocales,
  localeFallback,
})
watch(
  () => props.config.locale,
  (next) => {
    if (next && availableLocales.includes(next)) {
      runtimeLocale.setLocale(next)
    }
  },
  { immediate: true },
)

// 对齐 BuilderMain：子树内的 FormBuilder / FormRenderer 都能读取 i18n 文案
// （提交/重置按钮默认文案等），缺省 zh-CN。
provideFormBuilderI18n({
  locale: computed(() => runtimeLocale.locale.value),
  messages: computed(() => props.config.messages as Record<string, any> | undefined),
})
</script>

<template>
  <BuilderThemeScope
    :theme="props.theme"
    :locale="runtimeLocale.naiveLocale.value"
    :date-locale="runtimeLocale.naiveDateLocale.value"
    :theme-overrides="props.themeOverrides"
    :breakpoints="props.breakpoints"
    :cls-prefix="props.clsPrefix"
    :inline-theme-disabled="props.inlineThemeDisabled"
    :preflight-style-disabled="props.preflightStyleDisabled"
  >
    <div class="form-builder-provider">
      <slot />
    </div>
  </BuilderThemeScope>
</template>
