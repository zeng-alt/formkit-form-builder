<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import BindEditor from '../BindEditor.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()

const dividerTitlePlacement = createPropsProp<string>('titlePlacement', 'center')
const dividerDashed = createPropsProp<boolean>('dashed', false)
const dividerVertical = createPropsProp<boolean>('vertical', false)
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
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
