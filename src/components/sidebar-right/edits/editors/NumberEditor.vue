<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import ToggleInput from '../common/ToggleInput.vue'
import { INPUT_FULL_EVENTS } from '@/elements/definitions/bind-events'

const { whichNumber } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <BindEditor :events="INPUT_FULL_EVENTS" />
  <LabelHelpSection />
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
