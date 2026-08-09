<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import RangeInputs from '../common/RangeInputs.vue'
import { INPUT_BASIC_EVENTS } from '@/elements/definitions/bind-events'

const { min, max } = useFormField()
</script>

<template>
  <BindEditor :events="INPUT_BASIC_EVENTS" />
  <LabelHelpSection />
  <RangeInputs
    label-one="Min"
    label-two="Max"
    placeholder-one="0"
    placeholder-two="10"
    :value-one="min ?? null"
    :value-two="max ?? null"
    @update:valueOne="
      (v) => {
        if (v !== null) min = v
      }
    "
    @update:valueTwo="
      (v) => {
        if (v !== null) max = v
      }
    "
  />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
