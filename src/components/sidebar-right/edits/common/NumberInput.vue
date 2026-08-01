<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { NInputNumber } from 'naive-ui'
import { cn } from '../../../../utils/utils'
import EditsLayout from './EditsLayout.vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
  value: number | null
  placeholder: string
  label: string
}>()

const emit = defineEmits<{
  'update:value': [value: number | null]
}>()
</script>

<template>
  <EditsLayout :class="cn(props.class)">
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      props.label
    }}</label>
    <n-input-number
      size="small"
      :value="props.value"
      :placeholder="props.placeholder"
      @update:value="(v) => emit('update:value', v)"
    />
  </EditsLayout>
</template>
