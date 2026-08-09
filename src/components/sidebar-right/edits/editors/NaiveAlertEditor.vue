<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const alertTheme = createPropsProp<string>('theme', 'default')
const alertClosable = createPropsProp<boolean>('closable', false)
const alertBordered = createPropsProp<boolean>('bordered', false)
const alertShowIcon = createPropsProp<boolean>('showIcon', true)
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <SelectInput
    :label="t('edits.props.theme')"
    :value="alertTheme"
    :options="[
      { label: 'default', value: 'default' },
      { label: 'info', value: 'info' },
      { label: 'success', value: 'success' },
      { label: 'warning', value: 'warning' },
      { label: 'error', value: 'error' },
    ]"
    @update:value="(v) => (alertTheme = v)"
  />
  <SwitchInput
    :label="t('edits.props.closable')"
    :value="alertClosable"
    @update:value="(v) => (alertClosable = v)"
  />
  <SwitchInput
    :label="t('edits.props.bordered')"
    :value="alertBordered"
    @update:value="(v) => (alertBordered = v)"
  />
  <SwitchInput
    :label="t('edits.props.showIcon')"
    :value="alertShowIcon"
    @update:value="(v) => (alertShowIcon = v)"
  />
</template>
