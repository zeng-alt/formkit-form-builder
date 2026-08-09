<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import ToggleInput from '../common/ToggleInput.vue'
import { INPUT_BASIC_EVENTS } from '@/elements/definitions/bind-events'

const { numOfFiles } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <BindEditor :events="INPUT_BASIC_EVENTS" />
  <LabelHelpSection />
  <ToggleInput
    :label="t('edits.file.numberOfFiles')"
    :item-label-one="t('edits.file.multiple')"
    :item-label-two="t('edits.file.single')"
    value-one="true"
    value-two="false"
    type="single"
    :value="numOfFiles"
    @update:value="(v) => (numOfFiles = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>
