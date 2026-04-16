<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { NInput } from 'naive-ui'
import { cn } from '../../../../utils/utils'
import EditsLayout from './EditsLayout.vue'

const props = defineProps<{
  class?: HTMLAttributes['class']
  value: string
  placeholder: string
  label: string
  error?: string
}>()

const emit = defineEmits<{
  'update:value': [value: string]
}>()
</script>

<template>
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{ props.label }}</label>
    <n-input
      :value="props.value"
      @update:value="(v) => emit('update:value', v)"
      :placeholder="props.placeholder"
      type="textarea"
      :autosize="{ minRows: 6, maxRows: 14 }"
      :class="cn('rounded-md text-xs font-mono', props.class)"
    />
    <div v-if="props.error" class="text-[11px] text-destructive leading-tight">{{ props.error }}</div>
  </EditsLayout>
</template>

