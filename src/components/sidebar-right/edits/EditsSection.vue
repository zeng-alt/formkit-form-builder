<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../i18n/context'
import { fieldProps, getFieldEditorComponent } from '@/elements'
import NameInput from './common/NameInput.vue'
import StaticContentSection from './common/StaticContentSection.vue'

const { hasField, currentFieldType } = useFormField()
const { t } = useFormBuilderI18n()

const isStatic = computed(() => {
  if (!currentFieldType.value) return false
  const prop = fieldProps.find((p) => p.name === currentFieldType.value)
  return (prop?.category || 'field') === 'static'
})

const editorComponent = computed(() => {
  return getFieldEditorComponent(currentFieldType.value)
})
</script>

<template>
  <div v-if="!hasField" class="flex p-2 h-full text-[11px] md:text-xs text-muted-foreground">
    {{ t('common.selectFieldToEdit') }}
  </div>
  <template v-else>
    <div class="p-2">
      <div class="space-y-2 md:space-y-3">
        <NameInput />
        <StaticContentSection v-if="isStatic" />
        <component :is="editorComponent" v-if="editorComponent" />
      </div>
    </div>
  </template>
</template>
