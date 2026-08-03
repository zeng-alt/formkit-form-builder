import { computed, inject, provide, watch, type ComputedRef, type InjectionKey } from 'vue'
import { darkTheme, lightTheme, type GlobalTheme } from 'naive-ui'
import { useColorMode, usePreferredDark } from '@vueuse/core'
import type { BuilderTheme } from '@/types/theme'

export interface BuilderThemeContext {
  /** 当前生效的 naive-ui 主题（随 colorMode / 系统偏好） */
  activeTheme: ComputedRef<GlobalTheme>
  /** 强制切换主题（'light' | 'dark'），与 ThemeSwitcher / theme prop 共用同一 colorMode */
  setTheme: (theme: BuilderTheme) => void
}

const BUILDER_THEME_KEY: InjectionKey<BuilderThemeContext> = Symbol('FormBuilderTheme')

/**
 * 主题上下文：以 vueuse useColorMode 为唯一数据源（ThemeSwitcher 与 theme prop 都写这里），
 * activeTheme 由 colorMode 解析而来。explicitTheme（theme prop）仅作为初始化/强制同步入口，
 * 保证 naive-ui 主题与 UnoCSS 的 dark:* 样式始终一致。
 */
export function createBuilderThemeContext(
  explicitTheme?: () => BuilderTheme | undefined,
): BuilderThemeContext {
  const colorMode = useColorMode()
  const preferredDark = usePreferredDark()
  const activeTheme = computed<GlobalTheme>(() =>
    colorMode.value === 'dark' || (colorMode.value === 'auto' && preferredDark.value)
      ? darkTheme
      : lightTheme,
  )
  const setTheme = (theme: BuilderTheme) => {
    colorMode.value = theme
  }
  if (explicitTheme) {
    watch(
      explicitTheme,
      (theme) => {
        if (theme === 'light' || theme === 'dark') setTheme(theme)
      },
      { immediate: true },
    )
  }
  return { activeTheme, setTheme }
}

export function provideBuilderTheme(ctx: BuilderThemeContext) {
  provide(BUILDER_THEME_KEY, ctx)
}

export function useBuilderTheme(): BuilderThemeContext | null {
  return inject(BUILDER_THEME_KEY, null)
}
