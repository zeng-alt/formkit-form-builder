<script setup lang="ts">
import { NInput } from 'naive-ui'
import EditsLayout from './EditsLayout.vue'
import type { HTMLAttributes } from 'vue'
import { cn } from '../../../utils/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  value: string
  placeholder: string
  label: string
}>()

const emit = defineEmits<{
  'update:value': [value: string]
}>()
</script>

<template>
  <EditsLayout>
    <label for="myInput" class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      props.label
    }}</label>
    <n-input
      id="myInput"
      :value="props.value"
      @update:value="(v) => emit('update:value', v)"
      :placeholder="props.placeholder"
      :class="cn('h-8 rounded-md text-xs', props.class)"
    />
  </EditsLayout>
</template>
