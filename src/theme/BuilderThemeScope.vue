<script setup lang="ts">
import { computed } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NNotificationProvider,
  type ConfigProviderProps,
  type NDateLocale,
  type NLocale,
} from 'naive-ui'
import type { BuilderTheme } from '@/types/theme'
import {
  createBuilderThemeContext,
  provideBuilderTheme,
  useBuilderTheme,
} from '@/composables/use-builder-theme'

/**
 * 内部主题作用域：唯一的 n-config-provider 渲染点，同时也是唯一的
 * n-notification-provider / n-message-provider 渲染点——AiPrompt / ImportExportModal
 * 等组件用 naive-ui 的 useNotification() 弹提示，都要求祖先链上存在对应 provider，
 * 否则提示会静默不显示（此前用 vue-sonner 的 toast() 正是踩了这个坑：全仓库
 * 没有任何地方挂载过它要求的 <Toaster/>）。
 * 外层已有 BuilderProvider（主题由它统一控制）时直接继承、不重复渲染；
 * 独立使用（无 Provider）时自建主题上下文并兜底渲染 n-config-provider。
 * abstract 使其不产生额外 DOM 包裹节点，保证栅格布局 / h-screen 不受影响；
 * n-notification-provider / n-message-provider 本身渲染为 Fragment + Teleport，
 * 同样不产生包裹节点。
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
    <n-notification-provider>
      <n-message-provider>
        <slot />
      </n-message-provider>
    </n-notification-provider>
  </n-config-provider>
  <slot v-else />
</template>
