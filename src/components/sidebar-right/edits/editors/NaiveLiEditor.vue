<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import TextInput from '../common/TextInput.vue'

const { fieldValue } = useFormField()
</script>

<template>
  <TextInput label="text" placeholder="Enter text" :value="fieldValue" @update:value="(v) => (fieldValue = v)" />
</template>

