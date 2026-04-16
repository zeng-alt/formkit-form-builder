<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from './TextInput.vue'

const { placeholder } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <TextInput
    label="Placeholder"
    :placeholder="t('edits.placeholder.placeholder')"
    :value="placeholder"
    @update:value="(v) => (placeholder = v)"
  />
</template>
