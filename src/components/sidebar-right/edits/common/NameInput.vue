<script setup lang="ts">
import { computed } from 'vue'
import { getElementTypeDef } from '@/dsl'
import { useFormField } from '@/composables/form-fields'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '@/i18n/context'
import TextInput from './TextInput.vue'

// 所属 FormBuilder 实例状态：name 唯一性校验 / 选中定位绑定到各自实例。
const { formSchema, selectedIndex, selectedKey } = useFormBuilderState()
const { currentFieldType, fieldName, label, hasField } = useFormField()
const { t } = useFormBuilderI18n()

// 类型 → 分类（直接查注册表，覆盖无 template 的 group / grid / tabsPane 等）
const category = computed(() => {
  if (!currentFieldType.value) return null
  return getElementTypeDef(currentFieldType.value)?.category ?? null
})

// tabsPane/stepsPane 无独立目录项（无 fieldProps），但其"名称" = tab/step 标题（node.label）
const isTabsPane = computed(
  () => currentFieldType.value === 'tabsPane' || currentFieldType.value === 'stepsPane',
)

// 字段 / 容器 / 布局 + tab pane 都提供 name 编辑
const isNamedNode = computed(() => {
  const c = category.value
  return c === 'field' || c === 'container' || c === 'layout' || isTabsPane.value
})

const isFieldsCategory = computed(() => category.value === 'field')

const currentFieldKey = computed(() => selectedKey.value ?? undefined)

const isNameTaken = (name: string) => {
  const currentIndex = selectedIndex.value
  const walk = (schema: any[]): boolean => {
    for (const field of schema) {
      if (field?.name === name) {
        const key = field?.__key as string | undefined
        if (currentFieldKey.value && key && key !== currentFieldKey.value) return true
        if (!currentFieldKey.value && field !== formSchema.value[currentIndex]) return true
      }
      if (Array.isArray(field?.children) && walk(field.children)) return true
    }
    return false
  }
  if (!name) return false
  return walk(formSchema.value as any[])
}

// 字段：必填 + 格式 + 唯一；容器/布局/tab pane：可选，有值时校验格式与唯一
const nameError = computed(() => {
  if (!isNamedNode.value) return ''
  if (isFieldsCategory.value && !fieldName.value) return t('edits.nameRequired')
  if (!fieldName.value) return ''
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName.value)) return t('edits.nameFormat')
  if (isNameTaken(fieldName.value)) return t('edits.nameExists')
  return ''
})
</script>

<template>
  <!-- tab pane：Name（数据字段名）+ Label（tab 标题） -->
  <template v-if="hasField && isTabsPane">
    <TextInput
      :label="t('edits.name')"
      :placeholder="t('edits.placeholder.fieldName')"
      :value="fieldName"
      :error="nameError"
      @update:value="(v) => (fieldName = v)"
    />
    <TextInput
      :label="t('edits.label')"
      :placeholder="t('edits.placeholder.label')"
      :value="label"
      @update:value="(v) => (label = v)"
    />
  </template>
  <TextInput
    v-else-if="hasField && isNamedNode"
    :label="t('edits.name')"
    :placeholder="t('edits.placeholder.fieldName')"
    :value="fieldName"
    :error="nameError"
    @update:value="(v) => (fieldName = v)"
  />
</template>
