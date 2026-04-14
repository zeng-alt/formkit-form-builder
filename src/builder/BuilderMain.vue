<script setup lang="ts">
import {
  NConfigProvider,
  NLayout,
  type ConfigProviderProps
} from "naive-ui";
import SidebarLeft from "../components/sidebar-left/SidebarLeft.vue";
import SidebarRight from "../components/sidebar-right/SidebarRight.vue";
import BuilderDropArea from "./BuilderDropArea.vue";
import BuilderHeader from "./BuilderHeader.vue";

defineProps<ConfigProviderProps>();
</script>

<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="locale"
    :date-locale="dateLocale"
    :breakpoints="breakpoints"
    :cls-prefix="clsPrefix"
    :abstract="abstract"
    :inline-theme-disabled="inlineThemeDisabled"
    :preflight-style-disabled="preflightStyleDisabled"
  >
    <n-layout has-sider class="h-screen w-full">
      <SidebarLeft />
      <n-layout class="relative bg-gradient-to-br from-secondary to-emerald-100/50 dark:from-secondary dark:to-emerald-800/20" :native-scrollbar="false">
        <div class="p-4 h-full flex flex-col">
          <BuilderHeader />
          <BuilderDropArea />
        </div>
      </n-layout>
      <SidebarRight />
    </n-layout>
  </n-config-provider>
</template>
