<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import ToggleInput from '../common/ToggleInput.vue'

const { whichNumber } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <PlaceholderSection />
  <ToggleInput
    label=""
    :item-label-one="t('edits.number.decimal')"
    :item-label-two="t('edits.number.integer')"
    value-one="float"
    value-two="integer"
    type="single"
    :value="whichNumber"
    @update:value="(v) => (whichNumber = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>
