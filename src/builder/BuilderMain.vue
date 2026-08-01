<script setup lang="ts">
import { computed, watch } from 'vue'
import { NConfigProvider, NLayout, darkTheme, type ConfigProviderProps } from 'naive-ui'
import { useColorMode, usePreferredDark } from '@vueuse/core'
import { changeLocale } from '@formkit/vue'

import SidebarLeft from '../components/sidebar-left/SidebarLeft.vue'
import SidebarRight from '../components/sidebar-right/SidebarRight.vue'
import BuilderCanvas from './canvas/BuilderCanvas.vue'
import BuilderHeader from './BuilderHeader.vue'
import { useFormBuilderConfig } from '../composables/use-config'
import type { FormBuilderConfig } from '../types/env'
import { provideFormBuilderI18n } from '../i18n/context'
import { provideRuntimeLocale, type RuntimeLocale } from '../i18n/runtime-locale'
import { selectedKey, selectedTarget } from '@/state/form-schema'

const props = defineProps<ConfigProviderProps>()

const colorMode = useColorMode()
const preferredDark = usePreferredDark()
const resolvedIsDark = computed(
  () => colorMode.value === 'dark' || (colorMode.value === 'auto' && preferredDark.value),
)
const activeTheme = computed(() => {
  if (props.theme !== undefined) return props.theme
  return resolvedIsDark.value ? darkTheme : null
})

const cfg = useFormBuilderConfig() as FormBuilderConfig

const initialLocale: RuntimeLocale = cfg?.locale === 'en' ? 'en' : 'zh-CN'
const runtimeLocale = provideRuntimeLocale(initialLocale)

watch(
  () => runtimeLocale.locale.value,
  (next) => {
    changeLocale(next === 'en' ? 'en' : 'zh')
  },
  { immediate: true },
)

provideFormBuilderI18n({
  locale: computed(() => runtimeLocale.locale.value),
  messages: computed(() => cfg?.messages as Record<string, any> | undefined),
})

const onBuilderBlankPointerDown = (e: PointerEvent) => {
  const el = e.target as HTMLElement | null
  if (!el) return

  if (el.closest('[data-canvas-item="true"]')) return
  if (
    el.closest(
      'button,a,input,textarea,select,option,[role="button"],[role="switch"],[contenteditable="true"]',
    )
  )
    return
  if (el.closest('.n-button,.n-input,.n-select,.n-switch,.n-dropdown,.n-popover')) return

  selectedTarget.value = 'form'
  selectedKey.value = null
}
</script>

<template>
  <n-config-provider
    :theme="activeTheme"
    :theme-overrides="themeOverrides"
    :locale="runtimeLocale.naiveLocale.value"
    :date-locale="runtimeLocale.naiveDateLocale.value"
    :breakpoints="breakpoints"
    :cls-prefix="clsPrefix"
    :abstract="abstract"
    :inline-theme-disabled="inlineThemeDisabled"
    :preflight-style-disabled="preflightStyleDisabled"
  >
    <n-layout has-sider class="h-screen w-full">
      <SidebarLeft />
      <n-layout has-sider sider-placement="right" class="flex-1">
        <n-layout
          class="relative h-full"
          :native-scrollbar="false"
          @pointerdown.capture="onBuilderBlankPointerDown"
        >
          <div class="p-4 flex flex-1 min-h-0 flex-col">
            <BuilderHeader />
            <BuilderCanvas class="flex-1 min-h-0" />
          </div>
        </n-layout>
        <SidebarRight />
      </n-layout>
    </n-layout>
  </n-config-provider>
</template>
