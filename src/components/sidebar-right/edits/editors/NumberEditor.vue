<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import ToggleInput from '../common/ToggleInput.vue'
import { INPUT_FULL_EVENTS } from '@/elements/definitions/bind-events'

const { whichNumber } = useFormField()
</script>

<template>
  <BindEditor :events="INPUT_FULL_EVENTS" />
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
