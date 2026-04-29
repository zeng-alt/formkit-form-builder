<script setup lang="ts">
import { computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import type { DslNode } from '@/dsl/types'
import { dslToFormKitSchema } from '@/dsl/compiler'

const props = defineProps<{
  containerKey?: string
  modelValue?: DslNode[]
  label?: string
}>()

const { t } = useFormBuilderI18n()

const title = computed(() => (typeof props.label === 'string' && props.label.trim() ? props.label.trim() : ''))
const showHeader = computed(() => !!title.value)
const schema = computed(() => dslToFormKitSchema(Array.isArray(props.modelValue) ? props.modelValue : [], {}))
</script>

<template>
  <div class="w-full rounded-xl border border-border/50 bg-card/50">
    <div v-if="showHeader" class="flex items-center justify-between px-3 py-2 border-b border-border/50">
      <div v-if="title" class="text-xs text-muted-foreground">{{ title }}</div>
    </div>

    <div class="p-2">
      <div class="w-full grid grid-cols-12 gap-x-4 gap-y-2">
        <FormKitSchema v-if="schema.length" :schema="schema" />
        <n-empty v-else :description="t('builder.listDropHere')" />
      </div>
    </div>
  </div>
</template>
