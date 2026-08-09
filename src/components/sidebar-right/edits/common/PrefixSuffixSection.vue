<script setup lang="ts">
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from './TextInput.vue'

const { createPropsProp } = useFormField()
const { t } = useFormBuilderI18n()

const prefix = createPropsProp<string>('prefix', '')
const suffix = createPropsProp<string>('suffix', '')
</script>

<template>
  <TextInput
    :label="t('edits.props.prefix')"
    :placeholder="t('edits.placeholder.prefix')"
    :value="prefix"
    @update:value="(v) => (prefix = v)"
  />
  <TextInput
    :label="t('edits.props.suffix')"
    :placeholder="t('edits.placeholder.suffix')"
    :value="suffix"
    @update:value="(v) => (suffix = v)"
  />
</template>
