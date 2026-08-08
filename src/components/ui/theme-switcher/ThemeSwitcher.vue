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
    <n-button secondary circle size="small" class="h-16px w-16px !p-2">
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
