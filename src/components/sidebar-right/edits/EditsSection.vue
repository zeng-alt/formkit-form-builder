<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../i18n/context'
import { getFieldEditorComponent } from '../../../utils/field-props'
import NameInput from './common/NameInput.vue'

const { hasField, currentFieldType } = useFormField()
const { t } = useFormBuilderI18n()

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
        <component :is="editorComponent" v-if="editorComponent" />
      </div>
    </div>
  </template>
</template>
