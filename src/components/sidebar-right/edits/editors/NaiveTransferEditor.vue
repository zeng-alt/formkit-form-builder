<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import SwitchInput from '../common/SwitchInput.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
import { useFormField } from '@/composables/form-fields'
import { useFormBuilderI18n } from '@/i18n/context'
import { INPUT_BASIC_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const naiveFilterable = createPropsProp<boolean>('filterable', false)
</script>

<template>
  <BindEditor :events="INPUT_BASIC_EVENTS" />
  <LabelHelpSection />
  <OptionsSourceTabs mode="flat" />
  <SwitchInput
    :label="t('edits.props.filterable')"
    :value="naiveFilterable"
    @update:value="(v) => (naiveFilterable = v)"
  />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
