<script setup lang="ts">
import { NSelect } from 'naive-ui'
import EditsLayout from './EditsLayout.vue'

type Option = {
  label: string
  value: string
}

const props = defineProps<{
  value: string
  label: string
  options: Option[]
}>()

const emit = defineEmits<{
  'update:value': [value: string]
}>()
</script>

<template>
  <EditsLayout>
    <label class="text-xs font-medium tracking-wide text-foreground/80 block mb-1">{{
      props.label
    }}</label>
    <n-select
      size="small"
      :value="props.value"
      :options="props.options"
      @update:value="(v) => {
        if (v !== null) emit('update:value', v)
      }"
    />
  </EditsLayout>
</template>
