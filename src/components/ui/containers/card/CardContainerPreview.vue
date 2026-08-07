<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NCard, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'

const props = defineProps<{
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  help?: string
  bordered?: boolean
  embedded?: boolean
  hoverable?: boolean
  size?: string
}>()

const { t } = useFormBuilderI18n()

const schemaLibrary = getPreviewSchemaLibrary()

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const helpText = computed(() =>
  typeof props.help === 'string' && props.help.trim() ? props.help.trim() : '',
)
const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  if (Array.isArray(props.children)) return props.children
  return []
})

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
        <div v-if="helpText" class="text-xs text-muted-foreground">
          {{ helpText }}
        </div>
      </div>
    </template>
    <div class="w-full grid grid-cols-12 gap-x-4 gap-y-2">
      <FormKitSchema v-if="modelValue.length" :schema="modelValue" :library="schemaLibrary" />
      <div v-else class="col-span-12 flex min-h-[120px] items-center justify-center">
        <n-empty :description="t('builder.listDropHere')" />
      </div>
    </div>
  </n-card>
</template>
