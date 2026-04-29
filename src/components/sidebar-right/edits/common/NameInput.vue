<script setup lang="ts">
import { computed } from 'vue'
import { createFieldProps } from '../../../../utils/field-props'
import { useFormField } from '../../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from './TextInput.vue'

const { currentFieldType, fieldName, hasField, availableFieldNames } = useFormField()
const { t } = useFormBuilderI18n()

const isFieldsCategory = computed(() => {
  if (!currentFieldType.value) return false
  const prop = createFieldProps(t).find((p) => p.name === currentFieldType.value)
  return (prop?.category || 'fields') === 'fields'
})

const isNameTaken = (name: string) => {
  if (!name) return false
  const others = availableFieldNames.value.filter((n) => n !== fieldName.value)
  return others.includes(name)
}

const nameError = computed(() => {
  if (!isFieldsCategory.value) return ''
  if (!fieldName.value) return 'Name 不能为空'
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName.value)) return 'Name 只能包含字母/数字/_ 且不能以数字开头'
  if (isNameTaken(fieldName.value)) return 'Name 已存在'
  return ''
})
</script>

<template>
  <TextInput
    v-if="hasField && isFieldsCategory"
    label="Name"
    :placeholder="t('edits.placeholder.fieldName')"
    :value="fieldName"
    :error="nameError"
    @update:value="(v) => (fieldName = v)"
  />
</template>
