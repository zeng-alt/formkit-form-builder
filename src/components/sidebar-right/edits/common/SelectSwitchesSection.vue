<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import SwitchInput from './SwitchInput.vue'

const { createNaiveProp } = useFormField()

const naiveFilterable = createNaiveProp<boolean>('filterable', false)
const naiveMultiple = createNaiveProp<boolean>('multiple', false)
</script>

<template>
  <SwitchInput label="filterable" :value="naiveFilterable" @update:value="(v) => (naiveFilterable = v)" />
  <SwitchInput label="multiple" :value="naiveMultiple" @update:value="(v) => (naiveMultiple = v)" />
</template>

