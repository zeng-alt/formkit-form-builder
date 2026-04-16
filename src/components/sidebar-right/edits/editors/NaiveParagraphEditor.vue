<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'

const { createNaiveProp, fieldValue } = useFormField()

const typoType = createNaiveProp<string>('type', 'default')
const typoDepthRaw = createNaiveProp<unknown>('depth', 1)
const typoDepth = computed({
  get: () => {
    const value = typoDepthRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '1'
  },
  set: (value: string) => {
    const parsed = Number(value)
    typoDepthRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})
const typoAlign = createNaiveProp<string>('align', 'start')
</script>

<template>
  <TextInput label="text" placeholder="Enter text" :value="fieldValue" @update:value="(v) => (fieldValue = v)" />
  <SelectInput
    label="type"
    :value="typoType"
    :options="[
      { label: 'default', value: 'default' },
      { label: 'primary', value: 'primary' },
      { label: 'info', value: 'info' },
      { label: 'success', value: 'success' },
      { label: 'warning', value: 'warning' },
      { label: 'error', value: 'error' },
    ]"
    @update:value="(v) => (typoType = v)"
  />
  <SelectInput
    label="depth"
    :value="typoDepth"
    :options="[
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
    ]"
    @update:value="(v) => (typoDepth = v)"
  />
  <SelectInput
    label="align"
    :value="typoAlign"
    :options="[
      { label: 'start', value: 'start' },
      { label: 'center', value: 'center' },
      { label: 'end', value: 'end' },
      { label: 'justify', value: 'justify' },
    ]"
    @update:value="(v) => (typoAlign = v)"
  />
</template>
