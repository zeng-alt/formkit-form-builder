<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import TextInput from './TextInput.vue'

const { label, help } = useFormField()
</script>

<template>
  <TextInput
    label="Label"
    placeholder="Enter label"
    :value="label"
    @update:value="(v) => (label = v)"
  />
  <TextInput
    label="Help Text"
    placeholder="Enter help text"
    :value="help"
    @update:value="(v) => (help = v)"
  />
</template>

