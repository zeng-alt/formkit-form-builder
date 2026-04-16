<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import SelectInput from './SelectInput.vue'
import SwitchInput from './SwitchInput.vue'

const props = defineProps<{
  size?: boolean
  disabled?: boolean
  clearable?: boolean
}>()

const { createNaiveProp } = useFormField()

const naiveSize = createNaiveProp<string>('size', 'medium')
const naiveDisabled = createNaiveProp<boolean>('disabled', false)
const naiveClearable = createNaiveProp<boolean>('clearable', true)
</script>

<template>
  <SelectInput
    v-if="props.size"
    label="size"
    :value="naiveSize"
    :options="[
      { label: 'tiny', value: 'tiny' },
      { label: 'small', value: 'small' },
      { label: 'medium', value: 'medium' },
      { label: 'large', value: 'large' },
    ]"
    @update:value="(v) => (naiveSize = v)"
  />
  <SwitchInput
    v-if="props.disabled"
    label="disabled"
    :value="naiveDisabled"
    @update:value="(v) => (naiveDisabled = v)"
  />
  <SwitchInput
    v-if="props.clearable"
    label="clearable"
    :value="naiveClearable"
    @update:value="(v) => (naiveClearable = v)"
  />
</template>

