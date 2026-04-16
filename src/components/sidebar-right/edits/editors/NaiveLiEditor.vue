<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from '../common/TextInput.vue'

const { fieldValue } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <TextInput
    label="text"
    :placeholder="t('edits.placeholder.text')"
    :value="fieldValue"
    @update:value="(v) => (fieldValue = v)"
  />
</template>
