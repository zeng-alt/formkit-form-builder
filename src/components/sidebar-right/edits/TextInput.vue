<script setup lang="ts">
import { NInput } from 'naive-ui'
import EditsLayout from './EditsLayout.vue'
import { computed } from 'vue'
import type { HTMLAttributes, WritableComputedRef } from 'vue'
import { cn } from '../../../utils/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  model: WritableComputedRef<any, string>
  placeholder: string
  label: string
}>()

const modelValue = computed({
  get: () => props.model.value,
  set: (value: string) => {
    props.model.value = value
  },
})
</script>

<template>
  <EditsLayout>
    <label for="myInput" class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      props.label
    }}</label>
    <n-input
      id="myInput"
      v-model:value="modelValue"
      :placeholder="props.placeholder"
      :class="cn('h-8 rounded-md text-xs', props.class)"
    />
  </EditsLayout>
</template>
