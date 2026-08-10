<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import SwitchInput from '../common/SwitchInput.vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const listBordered = createPropsProp<boolean>('bordered', true)
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <LabelHelpSection />
  <SwitchInput
    :label="t('edits.props.bordered')"
    :value="listBordered"
    @update:value="(v) => (listBordered = v)"
  />
</template>
