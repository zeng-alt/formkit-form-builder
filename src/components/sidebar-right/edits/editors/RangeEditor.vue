<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import RangeInputs from '../common/RangeInputs.vue'

const { min, max } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
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
  <!-- NSlider 没有 size prop，开了也不会生效 -->
  <NaiveBasicSection :disabled="true" />
</template>
