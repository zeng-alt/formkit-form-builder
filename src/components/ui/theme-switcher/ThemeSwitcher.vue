<script setup lang="ts">
import { NButton, NDropdown } from 'naive-ui'
import { useColorMode } from '@vueuse/core'

type ColorMode = 'light' | 'dark' | 'auto'

const colorModeOptions = {
  disableTransition: false,
}
const mode = useColorMode(colorModeOptions)

const options = [
  { label: 'Light', key: 'light' },
  { label: 'Dark', key: 'dark' },
  { label: 'System', key: 'auto' },
]

const handleSelect = (key: string) => {
  mode.value = key as ColorMode
}
</script>

<template>
  <n-dropdown trigger="click" :options="options" @select="handleSelect">
    <n-button
      quaternary
      size="small"
      aria-label="Theme"
      class="!h-[36px] !w-[36px] !p-0 !rounded-[10px] border border-solid border-border/70 !bg-card shadow-sm hover:!bg-[#a277ff]/12 active:!scale-95 transition-[transform,background-color] duration-150 dark:border-border/50"
    >
      <template #icon>
        <div class="relative flex items-center justify-center">
          <span
            class="i-lucide-sun absolute h-16px text-[#eb2f96] w-16px rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          ></span>
          <span
            class="i-lucide-moon absolute h-16px w-16px text-[#b37feb] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          ></span>
        </div>
      </template>
    </n-button>
  </n-dropdown>
</template>
