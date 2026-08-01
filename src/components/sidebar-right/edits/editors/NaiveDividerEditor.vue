<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'

const { createPropsProp } = useFormField()

const dividerTitlePlacement = createPropsProp<string>('titlePlacement', 'center')
const dividerDashed = createPropsProp<boolean>('dashed', false)
const dividerVertical = createPropsProp<boolean>('vertical', false)
</script>

<template>
  <SelectInput
    label="title-placement"
    :value="dividerTitlePlacement"
    :options="[
      { label: 'left', value: 'left' },
      { label: 'center', value: 'center' },
      { label: 'right', value: 'right' },
    ]"
    @update:value="(v) => (dividerTitlePlacement = v)"
  />
  <SwitchInput label="dashed" :value="dividerDashed" @update:value="(v) => (dividerDashed = v)" />
  <SwitchInput
    label="vertical"
    :value="dividerVertical"
    @update:value="(v) => (dividerVertical = v)"
  />
</template>
