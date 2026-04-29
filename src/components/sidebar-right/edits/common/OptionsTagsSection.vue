<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TagsInput from './TagsInput.vue'

const props = defineProps<{
  label?: string
}>()

const { modelValue } = useFormField()
const { t } = useFormBuilderI18n()
</script>

<template>
  <TagsInput
    :label="props.label ?? t('edits.optionsLabel')"
    :placeholder="t('edits.placeholder.addItems')"
    :value="modelValue"
    @update:value="(v) => (modelValue = v)"
  />
</template>
