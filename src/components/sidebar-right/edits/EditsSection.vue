<script setup lang="ts">
import { computed } from 'vue'
import { useFormField } from '../../../composables/form-fields'
import { useFormBuilderI18n } from '../../../i18n/context'
import { getFieldEditorComponent } from '@/elements'
import { getElementTypeDef } from '@/dsl'
import NameInput from './common/NameInput.vue'
import StaticContentSection from './common/StaticContentSection.vue'
import ColSpanSection from './common/ColSpanSection.vue'
import CustomAttrsSection from './common/CustomAttrsSection.vue'

const { hasField, currentFieldType, selectedIsForm } = useFormField()
const { t } = useFormBuilderI18n()

const isStatic = computed(() => {
  if (!currentFieldType.value) return false
  return getElementTypeDef(currentFieldType.value)?.category === 'static'
})

const editorComponent = computed(() => {
  return getFieldEditorComponent(currentFieldType.value)
})
</script>

<template>
  <div v-if="!hasField" class="flex p-2 h-full text-[11px] md:text-xs text-muted-foreground">
    {{ t('common.selectFieldToEdit') }}
  </div>
  <!-- 外层 FormEditMain 已有 p-2，这里不再加内边距，保证与校验规则等分组左右对齐 -->
  <div v-else class="space-y-2 md:space-y-3">
    <NameInput />
    <ColSpanSection v-if="!selectedIsForm" />
    <StaticContentSection v-if="isStatic" />
    <component :is="editorComponent" v-if="editorComponent" />
    <CustomAttrsSection />
  </div>
</template>
