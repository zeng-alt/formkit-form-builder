<script setup lang="ts">
import { computed } from 'vue'
import { fieldProps } from '../../../../utils/field-props'
import { useFormField } from '../../../../composables/form-fields'
import { formSchema, selectedIndex } from '../../../../utils/default-form-elements'
import { useFormBuilderI18n } from '../../../../i18n/context'
import TextInput from './TextInput.vue'

const { currentFieldType, fieldName, hasField } = useFormField()
const { t } = useFormBuilderI18n()

const isFieldsCategory = computed(() => {
  if (!currentFieldType.value) return false
  const prop = fieldProps.find((p) => p.name === currentFieldType.value)
  return (prop?.category || 'fields') === 'fields'
})

const currentFieldKey = computed(
  () => (formSchema.value[selectedIndex.value] as any)?.__key as string | undefined,
)

const isNameTaken = (name: string) => {
  const walk = (schema: any[]): boolean => {
    for (const field of schema) {
      if (field?.name === name) {
        const key = field?.__key as string | undefined
        if (currentFieldKey.value && key && key !== currentFieldKey.value) return true
        if (!currentFieldKey.value && field !== formSchema.value[selectedIndex.value]) return true
      }
      if (Array.isArray(field?.children) && walk(field.children)) return true
    }
    return false
  }
  if (!name) return false
  return walk(formSchema.value as any[])
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
