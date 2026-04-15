<script setup lang="ts">
import { cn } from '../../../utils/utils'
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { NSwitch } from 'naive-ui'

const props = defineProps<{
  class?: HTMLAttributes['class']
  label?: string
  value?: boolean
}>()

const emit = defineEmits<{
  'update:value': [value: boolean]
}>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

function updateValue(value: boolean) {
  emit('update:value', value)
}
</script>

<template>
  <div v-bind="delegatedProps" :class="cn('flex flex-row gap-2 items-center justify-between py-1', props.class)">
    <label class="text-xs text-foreground/80 font-medium">{{ label }}</label>
    <n-switch size="small" :value="value" @update:value="updateValue" />
  </div>
</template>
