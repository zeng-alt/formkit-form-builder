<script setup lang="ts">
import { computed } from 'vue'
import { NDivider } from 'naive-ui'
import ValidationSection from './validations/ValidationSection.vue'
import { useFormField } from '../../composables/form-fields'
import EditsSection from './edits/EditsSection.vue'
import ExpressionEditor from './edits/ExpressionEditor.vue'
import IfConditionEditor from './edits/IfConditionEditor.vue'
import BindEditor from './edits/BindEditor.vue'
import { getElementTypeDef } from '@/dsl'
import FormEditor from './edits/editors/FormEditor.vue'
import DataTableColumnEditor from './edits/editors/DataTableColumnEditor.vue'

const { hasField, currentFieldType, selectedIsForm, selectedColumn } = useFormField()

const isFieldsCategory = computed(() => {
  if (selectedIsForm.value) return false
  if (!currentFieldType.value) return false
  // 直接查注册表分类；目录外的类型（tabsPane / grid / row / column）不是字段
  return getElementTypeDef(currentFieldType.value)?.category === 'field'
})
</script>

<template>
  <div class="p-2">
    <div class="space-y-2 md:space-y-3">
      <DataTableColumnEditor v-if="selectedColumn" />
      <FormEditor v-else-if="!hasField || selectedIsForm" />
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
