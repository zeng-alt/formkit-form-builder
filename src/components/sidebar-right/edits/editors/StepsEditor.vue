<script setup lang="ts">
import BindEditor from '../BindEditor.vue'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const size = createPropsProp<string>('size', 'small')
const status = createPropsProp<string>('status', 'process')
const vertical = createPropsProp<boolean>('vertical', false)
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <LabelHelpSection />
  <SelectInput
    :label="t('edits.props.size')"
    :value="size"
    :options="[
      { label: 'small', value: 'small' },
      { label: 'medium', value: 'medium' },
    ]"
    @update:value="(v) => (size = v)"
  />
  <SelectInput
    :label="t('edits.props.status')"
    :value="status"
    :options="[
      { label: 'process', value: 'process' },
      { label: 'finish', value: 'finish' },
      { label: 'error', value: 'error' },
      { label: 'wait', value: 'wait' },
    ]"
    @update:value="(v) => (status = v)"
  />
  <SwitchInput
    :label="t('edits.props.vertical')"
    :value="vertical"
    @update:value="(v) => (vertical = v)"
  />
</template>
