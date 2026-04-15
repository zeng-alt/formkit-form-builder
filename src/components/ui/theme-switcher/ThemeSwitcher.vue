<script setup lang="ts">
import { NButton, NDropdown } from 'naive-ui'
import { useColorMode } from '@vueuse/core'
import { Sun, Moon } from 'lucide-vue-next'

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
    <n-button secondary circle size="small" class="h-5 w-5 !p-2">
      <template #icon>
        <div class="relative flex items-center justify-center">
          <Sun
            class="absolute h-3 w-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 dark:text-green-200"
          />
          <Moon
            class="absolute h-3 w-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 dark:text-green-200"
          />
        </div>
      </template>
    </n-button>
  </n-dropdown>
</template>
