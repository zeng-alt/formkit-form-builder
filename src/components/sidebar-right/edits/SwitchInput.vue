<script setup lang="ts">
import { NSwitch } from 'naive-ui'
import EditsLayout from './EditsLayout.vue'

const props = defineProps<{
  value: boolean
  label: string
}>()

const emit = defineEmits<{
  'update:value': [value: boolean]
}>()
</script>

<template>
  <EditsLayout class="flex-row items-center justify-between gap-3">
    <label class="text-xs font-medium tracking-wide text-foreground/80">{{ props.label }}</label>
    <n-switch size="small" :value="props.value" @update:value="(v) => emit('update:value', v)" />
  </EditsLayout>
</template>
