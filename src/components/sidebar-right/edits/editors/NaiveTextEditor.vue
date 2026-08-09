<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import { computed } from 'vue'
import BindEditor from '../BindEditor.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'
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
const typoStrong = createPropsProp<boolean>('strong', false)
const typoItalic = createPropsProp<boolean>('italic', false)
const typoUnderline = createPropsProp<boolean>('underline', false)
const typoDelete = createPropsProp<boolean>('delete', false)
const typoCode = createPropsProp<boolean>('code', false)
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
  <SwitchInput
    :label="t('edits.props.strong')"
    :value="typoStrong"
    @update:value="(v) => (typoStrong = v)"
  />
  <SwitchInput
    :label="t('edits.props.italic')"
    :value="typoItalic"
    @update:value="(v) => (typoItalic = v)"
  />
  <SwitchInput
    :label="t('edits.props.underline')"
    :value="typoUnderline"
    @update:value="(v) => (typoUnderline = v)"
  />
  <SwitchInput
    :label="t('edits.props.delete')"
    :value="typoDelete"
    @update:value="(v) => (typoDelete = v)"
  />
  <SwitchInput
    :label="t('edits.props.code')"
    :value="typoCode"
    @update:value="(v) => (typoCode = v)"
  />
</template>
