<script setup lang="ts">
import { computed } from 'vue'
import { NConfigProvider, NLayout, darkTheme, type ConfigProviderProps } from 'naive-ui'
import { useColorMode } from '@vueuse/core'
import SidebarLeft from '../components/sidebar-left/SidebarLeft.vue'
import SidebarRight from '../components/sidebar-right/SidebarRight.vue'
import BuilderDropArea from './BuilderDropArea.vue'
import BuilderHeader from './BuilderHeader.vue'
import { useFormBuilderConfig } from '../composables/use-config'
import { provideFormBuilderI18n } from '../i18n/context'
import { provideRuntimeLocale, type RuntimeLocale } from '../i18n/runtime-locale'
import type { FormBuilderConfig } from '../types/env'

const props = defineProps<ConfigProviderProps>()

const colorMode = useColorMode()
const activeTheme = computed(() => {
  if (props.theme !== undefined) return props.theme
  return colorMode.value === 'dark' ? darkTheme : null
})

const cfg = useFormBuilderConfig() as FormBuilderConfig
const initialLocale: RuntimeLocale = cfg?.locale === 'en' ? 'en' : 'zh-CN'
const runtimeLocale = provideRuntimeLocale(initialLocale)

provideFormBuilderI18n({
  locale: computed(() => runtimeLocale.locale.value),
  messages: computed(() => cfg?.messages as Record<string, any> | undefined),
})
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
      <n-layout
        class="relative"
        :native-scrollbar="false"
      >
        <div class="p-4 h-full flex flex-col">
          <BuilderHeader />
          <BuilderDropArea />
        </div>
      </n-layout>
      <SidebarRight />
    </n-layout>
  </n-config-provider>
</template>
