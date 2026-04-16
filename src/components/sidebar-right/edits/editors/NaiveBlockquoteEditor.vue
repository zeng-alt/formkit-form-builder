<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'

const { createNaiveProp } = useFormField()

const typographyText = createNaiveProp<string>('text', 'text')
const typoType = createNaiveProp<string>('type', 'default')
</script>

<template>
  <TextInput label="text" placeholder="Enter text" :value="typographyText" @update:value="(v) => (typographyText = v)" />
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
</template>

