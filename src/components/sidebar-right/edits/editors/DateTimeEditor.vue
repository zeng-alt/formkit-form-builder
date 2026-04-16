<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import TextInput from '../common/TextInput.vue'

const { createNaiveProp } = useFormField()
const naiveDateTimeValueFormat = createNaiveProp<string>('valueFormat', 'yyyy.MM.dd HH:mm:ss')
</script>

<template>
  <LabelHelpSection />
  <PlaceholderSection />
  <TextInput
    label="value-format"
    placeholder="yyyy.MM.dd HH:mm:ss"
    :value="naiveDateTimeValueFormat"
    @update:value="(v) => (naiveDateTimeValueFormat = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>

