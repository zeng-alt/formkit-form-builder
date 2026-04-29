<script setup lang="ts">
import { useFormBuilderI18n } from '../../../../i18n/context'
import { useFormField } from '../../../../composables/form-fields'
import SwitchInput from './SwitchInput.vue'

const { t } = useFormBuilderI18n()
const { createPropsProp } = useFormField()

const horizontal = createPropsProp<boolean>('horizontal', false)
</script>

<template>
  <SwitchInput
    :label="t('edits.optionsLayout.horizontal')"
    :value="horizontal"
    @update:value="(v) => (horizontal = v)"
  />
</template>

