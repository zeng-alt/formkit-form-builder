<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import BindEditor from '../BindEditor.vue'
import SelectInput from '../common/SelectInput.vue'
import { NO_EVENTS } from '@/elements/definitions/bind-events'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const typoTheme = createPropsProp<string>('theme', 'default')
const typoDepthRaw = createPropsProp<unknown>('depth', 1)
const typoDepth = computed({
  get: () => {
    const value = typoDepthRaw.value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
    if (typeof value === 'string') return value
    return '1'
  },
  set: (value: string) => {
    const parsed = Number(value)
    typoDepthRaw.value = Number.isFinite(parsed) ? parsed : value
  },
})
const typoAlign = createPropsProp<string>('align', 'start')
</script>

<template>
  <BindEditor :events="NO_EVENTS" />
  <SelectInput
    :label="t('edits.props.theme')"
    :value="typoTheme"
    :options="[
      { label: 'default', value: 'default' },
      { label: 'primary', value: 'primary' },
      { label: 'info', value: 'info' },
      { label: 'success', value: 'success' },
      { label: 'warning', value: 'warning' },
      { label: 'error', value: 'error' },
    ]"
    @update:value="(v) => (typoTheme = v)"
  />
  <SelectInput
    :label="t('edits.props.depth')"
    :value="typoDepth"
    :options="[
      { label: '1', value: '1' },
      { label: '2', value: '2' },
      { label: '3', value: '3' },
    ]"
    @update:value="(v) => (typoDepth = v)"
  />
  <SelectInput
    :label="t('edits.props.align')"
    :value="typoAlign"
    :options="[
      { label: 'start', value: 'start' },
      { label: 'center', value: 'center' },
      { label: 'end', value: 'end' },
      { label: 'justify', value: 'justify' },
    ]"
    @update:value="(v) => (typoAlign = v)"
  />
</template>
