<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import RangeInputs from '../common/RangeInputs.vue'
import { INPUT_BASIC_EVENTS } from '@/elements/definitions/bind-events'

const { min, max } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <BindEditor :events="INPUT_BASIC_EVENTS" />
  <LabelHelpSection />
  <RangeInputs
    :label-one="t('validation.minLabel')"
    :label-two="t('validation.maxLabel')"
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
