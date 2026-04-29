<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from '../common/TextInput.vue'
import SelectInput from '../common/SelectInput.vue'
import SwitchInput from '../common/SwitchInput.vue'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const alertTitle = createPropsProp<string>('title', 'Title')
const alertContent = createPropsProp<string>('content', 'Alert')
const alertType = createPropsProp<string>('type', 'default')
const alertClosable = createPropsProp<boolean>('closable', false)
const alertBordered = createPropsProp<boolean>('bordered', false)
const alertShowIcon = createPropsProp<boolean>('showIcon', true)
</script>

<template>
  <TextInput
    label="title"
    :placeholder="t('edits.placeholder.text')"
    :value="alertTitle"
    @update:value="(v) => (alertTitle = v)"
  />
  <TextInput
    label="content"
    :placeholder="t('edits.placeholder.text')"
    :value="alertContent"
    @update:value="(v) => (alertContent = v)"
  />
  <SelectInput
    label="type"
    :value="alertType"
    :options="[
      { label: 'default', value: 'default' },
      { label: 'info', value: 'info' },
      { label: 'success', value: 'success' },
      { label: 'warning', value: 'warning' },
      { label: 'error', value: 'error' },
    ]"
    @update:value="(v) => (alertType = v)"
  />
  <SwitchInput label="closable" :value="alertClosable" @update:value="(v) => (alertClosable = v)" />
  <SwitchInput label="bordered" :value="alertBordered" @update:value="(v) => (alertBordered = v)" />
  <SwitchInput label="show-icon" :value="alertShowIcon" @update:value="(v) => (alertShowIcon = v)" />
</template>
