<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'

const { createPropsProp } = useFormField()

const alertTheme = createPropsProp<string>('theme', 'default')
const alertClosable = createPropsProp<boolean>('closable', false)
const alertBordered = createPropsProp<boolean>('bordered', false)
const alertShowIcon = createPropsProp<boolean>('showIcon', true)
</script>

<template>
  <SelectInput
    label="theme"
    :value="alertTheme"
    :options="[
      { label: 'default', value: 'default' },
      { label: 'info', value: 'info' },
      { label: 'success', value: 'success' },
      { label: 'warning', value: 'warning' },
      { label: 'error', value: 'error' },
    ]"
    @update:value="(v) => (alertTheme = v)"
  />
  <SwitchInput label="closable" :value="alertClosable" @update:value="(v) => (alertClosable = v)" />
  <SwitchInput label="bordered" :value="alertBordered" @update:value="(v) => (alertBordered = v)" />
  <SwitchInput
    label="show-icon"
    :value="alertShowIcon"
    @update:value="(v) => (alertShowIcon = v)"
  />
</template>
