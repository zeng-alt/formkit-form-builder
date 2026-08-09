<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from './TextInput.vue'

const { label, help } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <TextInput
    :label="t('edits.label')"
    :placeholder="t('edits.placeholder.label')"
    :value="label"
    @update:value="(v) => (label = v)"
  />
  <TextInput
    :label="t('edits.helpText')"
    :placeholder="t('edits.placeholder.help')"
    :value="help"
    @update:value="(v) => (help = v)"
  />
</template>
