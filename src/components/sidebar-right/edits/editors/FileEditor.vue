<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import ToggleInput from '../common/ToggleInput.vue'

const { numOfFiles } = useFormField()
</script>

<template>
  <LabelHelpSection />
  <ToggleInput
    label="Number of files"
    item-label-one="Multiple"
    item-label-two="Single"
    value-one="true"
    value-two="false"
    type="single"
    :value="numOfFiles"
    @update:value="(v) => (numOfFiles = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>

