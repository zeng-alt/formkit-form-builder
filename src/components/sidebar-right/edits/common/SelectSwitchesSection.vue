<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import SwitchInput from './SwitchInput.vue'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const naiveFilterable = createPropsProp<boolean>('filterable', false)
const naiveMultiple = createPropsProp<boolean>('multiple', false)
</script>

<template>
  <SwitchInput
    :label="t('edits.props.filterable')"
    :value="naiveFilterable"
    @update:value="(v) => (naiveFilterable = v)"
  />
  <SwitchInput
    :label="t('edits.props.multiple')"
    :value="naiveMultiple"
    @update:value="(v) => (naiveMultiple = v)"
  />
</template>
