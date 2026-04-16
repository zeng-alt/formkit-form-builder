<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import ToggleInput from '../common/ToggleInput.vue'

const { whichNumber } = useFormField()
</script>

<template>
  <LabelHelpSection />
  <PlaceholderSection />
  <ToggleInput
    label=""
    item-label-one="Decimal"
    item-label-two="Integer"
    value-one="float"
    value-two="integer"
    type="single"
    :value="whichNumber"
    @update:value="(v) => (whichNumber = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>

