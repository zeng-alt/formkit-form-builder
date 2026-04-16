<script setup lang="ts">
import { computed } from 'vue'
import { NDivider } from 'naive-ui'
import ValidationSection from './validations/ValidationSection.vue'
import { useFormField } from '../../composables/form-fields'
import EditsSection from './edits/EditsSection.vue'
import ExpressionEditor from './edits/ExpressionEditor.vue'
import { fieldProps } from '../../utils/field-props'

const { hasField, currentFieldType } = useFormField()

const isFieldsCategory = computed(() => {
  if (!currentFieldType.value) return false
  const prop = fieldProps.find((p) => p.name === currentFieldType.value)
  return (prop?.category || 'fields') === 'fields'
})
</script>

<template>
  <div v-if="!hasField" class="flex p-2 h-full text-[11px] md:text-xs text-muted-foreground">
    Select a field to edit its properties
  </div>
  <template v-else>
    <div class="p-2">
      <div class="space-y-2 md:space-y-3">
        <ExpressionEditor v-if="isFieldsCategory" />
        <EditsSection />
        <n-divider />
        <ValidationSection />
      </div>
    </div>
  </template>
</template>

