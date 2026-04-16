<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import RangeInputs from '../common/RangeInputs.vue'

const { min, max } = useFormField()
</script>

<template>
  <LabelHelpSection />
  <RangeInputs
    label-one="Min"
    label-two="Max"
    placeholder-one="0"
    placeholder-two="10"
    :value-one="min ?? null"
    :value-two="max ?? null"
    @update:valueOne="(v) => {
      if (v !== null) min = v
    }"
    @update:valueTwo="(v) => {
      if (v !== null) max = v
    }"
  />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>

