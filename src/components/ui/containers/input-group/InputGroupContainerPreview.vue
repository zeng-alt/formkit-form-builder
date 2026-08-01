<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NInputGroup, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/containers/registry'

const props = defineProps<{
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  help?: string
}>()

const { t } = useFormBuilderI18n()

const schemaLibrary = getPreviewSchemaLibrary()

const title = computed(() => (typeof props.label === 'string' && props.label.trim() ? props.label.trim() : ''))
const helpText = computed(() => (typeof props.help === 'string' && props.help.trim() ? props.help.trim() : ''))
const showHeader = computed(() => Boolean(title.value || helpText.value))
const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  if (Array.isArray(props.children)) return props.children
  return []
})
</script>

<template>
  <div class="w-full">
    <div v-if="showHeader" class="mb-2">
      <div v-if="title" class="text-sm font-medium">{{ title }}</div>
      <div v-if="helpText" class="text-xs text-muted-foreground">{{ helpText }}</div>
    </div>
    <n-input-group class="w-full">
      <FormKitSchema v-if="modelValue.length" :schema="modelValue" :library="schemaLibrary" />
      <n-empty v-else :description="t('builder.listDropHere')" />
    </n-input-group>
  </div>
</template>

