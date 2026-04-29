<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import SwitchInput from './SwitchInput.vue'

const { createPropsProp } = useFormField()

const naiveFilterable = createPropsProp<boolean>('filterable', false)
const naiveMultiple = createPropsProp<boolean>('multiple', false)
</script>

<template>
  <SwitchInput label="filterable" :value="naiveFilterable" @update:value="(v) => (naiveFilterable = v)" />
  <SwitchInput label="multiple" :value="naiveMultiple" @update:value="(v) => (naiveMultiple = v)" />
</template>
