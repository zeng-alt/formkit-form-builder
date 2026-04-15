<script setup lang="ts">
import { cn } from '../../../utils/utils'
import type { HTMLAttributes } from 'vue'
import { NSwitch, NTooltip } from 'naive-ui'
import { CircleHelp } from 'lucide-vue-next'

const props = defineProps<{
  class?: HTMLAttributes['class']
  isActive?: boolean
  label?: string
  showSwitch?: boolean
  tooltip?: string
}>()

const emit = defineEmits<{
  'update:isActive': [value: boolean]
}>()

function updateValue(value: boolean) {
  emit('update:isActive', value)
}
</script>

<template>
  <div :class="cn('flex flex-row gap-2 items-center', props.class)">
    <n-switch size="small" :value="props.isActive" @update:value="updateValue" />
    <div class="flex flex-row justify-between items-center w-full">
      <span class="text-xs">{{ props.label }}</span>
      <n-tooltip trigger="hover" placement="top">
        <template #trigger>
          <CircleHelp class="h-4 w-4 text-muted-foreground rounded-full" />
        </template>
        {{ props.tooltip }}
      </n-tooltip>
    </div>
  </div>
</template>
