<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import LabelHelpSection from '../common/LabelHelpSection.vue'
import TextInput from '../common/TextInput.vue'
import { useFormBuilderI18n } from '../../../../i18n/context'

const { buttonText } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <TextInput
    label="Button Text"
    :placeholder="t('edits.placeholder.label')"
    :value="buttonText"
    @update:value="(v) => (buttonText = v)"
  />
</template>
