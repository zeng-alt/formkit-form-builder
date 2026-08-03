<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, type ConfigProviderProps, type NDateLocale, type NLocale } from 'naive-ui'
import type { BuilderTheme } from '@/types/theme'
import {
  createBuilderThemeContext,
  provideBuilderTheme,
  useBuilderTheme,
} from '@/composables/use-builder-theme'

/**
 * 内部主题作用域：唯一的 n-config-provider 渲染点。
 * 外层已有 BuilderProvider（主题由它统一控制）时直接继承、不重复渲染；
 * 独立使用（无 Provider）时自建主题上下文并兜底渲染 n-config-provider。
 * abstract 使其不产生额外 DOM 包裹节点，保证栅格布局 / h-screen 不受影响。
 */
const props = withDefaults(
  defineProps<{
    /** 主题；在外层已有 BuilderProvider 时被忽略（主题由 Provider 统一控制） */
    theme?: BuilderTheme
    /** naive-ui 语言包 */
    locale?: NLocale
    dateLocale?: NDateLocale
    themeOverrides?: ConfigProviderProps['themeOverrides']
    breakpoints?: ConfigProviderProps['breakpoints']
    clsPrefix?: string
    inlineThemeDisabled?: boolean
    preflightStyleDisabled?: boolean
  }>(),
  {},
)

const inherited = useBuilderTheme()
const themeCtx = inherited ?? createBuilderThemeContext(() => props.theme)
if (!inherited) provideBuilderTheme(themeCtx)

const scopeConfig = computed(() => ({
  themeOverrides: props.themeOverrides,
  breakpoints: props.breakpoints,
  clsPrefix: props.clsPrefix,
  inlineThemeDisabled: props.inlineThemeDisabled,
  preflightStyleDisabled: props.preflightStyleDisabled,
}))
</script>

<template>
  <n-config-provider
    v-if="!inherited"
    abstract
    :theme="themeCtx.activeTheme.value"
    :locale="props.locale"
    :date-locale="props.dateLocale"
    v-bind="scopeConfig"
  >
    <slot />
  </n-config-provider>
  <slot v-else />
</template>
