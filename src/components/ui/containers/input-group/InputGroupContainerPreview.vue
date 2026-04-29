<script setup lang="ts">
import { computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NInputGroup, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import type { DslNode } from '@/dsl/types'
import { dslToFormKitSchema } from '@/dsl/compiler'

const props = defineProps<{
  modelValue?: DslNode[]
  label?: string
  help?: string
}>()

const { t } = useFormBuilderI18n()

const title = computed(() => (typeof props.label === 'string' && props.label.trim() ? props.label.trim() : ''))
const helpText = computed(() => (typeof props.help === 'string' && props.help.trim() ? props.help.trim() : ''))
const showHeader = computed(() => Boolean(title.value || helpText.value))
const schema = computed(() => dslToFormKitSchema(Array.isArray(props.modelValue) ? props.modelValue : [], {}))
</script>

<template>
  <div class="w-full">
    <div v-if="showHeader" class="mb-2">
      <div v-if="title" class="text-sm font-medium">{{ title }}</div>
      <div v-if="helpText" class="text-xs text-muted-foreground">{{ helpText }}</div>
    </div>
    <n-input-group class="w-full">
      <FormKitSchema v-if="schema.length" :schema="schema" />
      <n-empty v-else :description="t('builder.listDropHere')" />
    </n-input-group>
  </div>
</template>
