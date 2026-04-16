<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import TextInput from './TextInput.vue'

const { placeholder } = useFormField()
</script>

<template>
  <TextInput
    label="Placeholder"
    placeholder="Enter placeholder"
    :value="placeholder"
    @update:value="(v) => (placeholder = v)"
  />
</template>

