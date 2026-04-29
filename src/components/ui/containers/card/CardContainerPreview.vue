<script setup lang="ts">
import { computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NCard, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import type { DslNode } from '@/dsl/types'
import { dslToFormKitSchema } from '@/dsl/compiler'

const props = defineProps<{
  modelValue?: DslNode[]
  label?: string
  help?: string
  bordered?: boolean
  embedded?: boolean
  hoverable?: boolean
  size?: string
}>()

const { t } = useFormBuilderI18n()

const title = computed(() => (typeof props.label === 'string' && props.label.trim() ? props.label.trim() : ''))
const helpText = computed(() => (typeof props.help === 'string' && props.help.trim() ? props.help.trim() : ''))
const schema = computed(() => dslToFormKitSchema(Array.isArray(props.modelValue) ? props.modelValue : [], {}))

const bordered = computed<boolean>(() => props.bordered ?? true)
const embedded = computed<boolean>(() => props.embedded ?? false)
const hoverable = computed<boolean>(() => props.hoverable ?? false)
const size = computed(() => props.size ?? 'medium')
const showHeader = computed(() => Boolean(title.value || helpText.value))
</script>

<template>
  <n-card
    class="w-full"
    :bordered="bordered"
    :embedded="embedded"
    :hoverable="hoverable"
    :size="size as any"
    content-style="padding: 8px;"
  >
    <template v-if="showHeader" #header>
      <div class="flex flex-col gap-0.5">
        <div v-if="title" class="text-sm font-medium">{{ title }}</div>
        <div v-if="helpText" class="text-xs text-muted-foreground">{{ helpText }}</div>
      </div>
    </template>
    <div class="w-full grid grid-cols-12 gap-x-4 gap-y-2">
      <FormKitSchema v-if="schema.length" :schema="schema" />
      <n-empty v-else :description="t('builder.listDropHere')" />
    </div>
  </n-card>
</template>
