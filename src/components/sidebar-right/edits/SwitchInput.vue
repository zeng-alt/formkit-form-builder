<script setup lang="ts">
import { cn } from '../../../utils/utils'
import type { HTMLAttributes } from 'vue'
import { NSwitch } from 'naive-ui'

const props = defineProps<{
  class?: HTMLAttributes['class']
  label?: string
  value?: boolean
}>()

const emit = defineEmits<{
  'update:value': [value: boolean]
}>()

function updateValue(value: boolean) {
  emit('update:value', value)
}
</script>

<template>
  <div :class="cn('flex flex-row gap-2 items-center justify-between py-1', props.class)">
    <label class="text-xs text-foreground/80 font-medium">{{ props.label }}</label>
    <n-switch size="small" :value="props.value" @update:value="updateValue" />
  </div>
</template>
