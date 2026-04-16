<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import SwitchInput from '../common/SwitchInput.vue'
import TextInput from '../common/TextInput.vue'

const { createNaiveProp } = useFormField()

const naiveRateAllowHalf = createNaiveProp<boolean>('allowHalf', false)
const naiveRateCountRaw = createNaiveProp<unknown>('count', 5)
const naiveRateCount = computed({
  get: () => {
    const value = naiveRateCountRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '5'
  },
  set: (value: string) => {
    const parsed = Number(value)
    naiveRateCountRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})
</script>

<template>
  <LabelHelpSection />
  <TextInput
    label="count"
    placeholder="5"
    :value="naiveRateCount"
    @update:value="(v) => (naiveRateCount = v)"
  />
  <SwitchInput
    label="allow-half"
    :value="naiveRateAllowHalf"
    @update:value="(v) => (naiveRateAllowHalf = v)"
  />
  <NaiveBasicSection :disabled="true" :clearable="true" />
</template>

