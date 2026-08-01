<script setup lang="ts">
import { computed } from 'vue'
import { NDivider } from 'naive-ui'
import { useFormBuilderI18n } from '../../i18n/context'
import ValidationSection from './validations/ValidationSection.vue'
import { useFormField } from '../../composables/form-fields'
import EditsSection from './edits/EditsSection.vue'
import ExpressionEditor from './edits/ExpressionEditor.vue'
import IfConditionEditor from './edits/IfConditionEditor.vue'
import BindEditor from './edits/BindEditor.vue'
import { createFieldProps } from '@/elements'
import FormEditor from './edits/editors/FormEditor.vue'

const { hasField, currentFieldType, selectedIsForm } = useFormField()
const { t } = useFormBuilderI18n()
const fieldProps = computed(() => createFieldProps(t))

const isFieldsCategory = computed(() => {
  if (selectedIsForm.value) return false
  if (!currentFieldType.value) return false
  const prop = fieldProps.value.find((p) => p.name === currentFieldType.value)
  return (prop?.category || 'fields') === 'fields'
})
</script>

<template>
  <div class="p-2">
    <div class="space-y-2 md:space-y-3">
      <FormEditor v-if="!hasField || selectedIsForm" />
      <template v-else>
        <ExpressionEditor v-if="isFieldsCategory" />
        <IfConditionEditor />
        <BindEditor />
        <EditsSection />
        <n-divider />
        <ValidationSection />
      </template>
    </div>
  </div>
</template>
