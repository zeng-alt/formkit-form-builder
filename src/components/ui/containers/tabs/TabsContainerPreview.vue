<script setup lang="ts">
import { computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NEmpty, NTabPane, NTabs } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import type { DslNode } from '@/dsl/types'
import { dslToFormKitSchema } from '@/dsl/compiler'

type TabsPane = { __key: string; label?: string; children?: DslNode[] }

const props = defineProps<{
  modelValue?: TabsPane[]
  label?: string
  help?: string
  type?: string
  placement?: string
  size?: string
  animated?: boolean
  closable?: boolean
}>()

const { t } = useFormBuilderI18n()

const modelValue = computed(() => {
  return Array.isArray(props.modelValue) ? props.modelValue : []
})

const tabLabel = (child: any, idx: number) => {
  const label = child?.label
  if (typeof label === 'string' && label.trim()) return label.trim()
  return `Tab ${idx + 1}`
}

const paneClosable = computed<boolean>(() => Boolean(props.closable ?? false))
</script>

<template>
  <div class="w-full">
    <div v-if="props.label || props.help" class="flex flex-col gap-0.5 mb-2">
      <div v-if="props.label" class="text-sm font-medium">{{ props.label }}</div>
      <div v-if="props.help" class="text-xs text-muted-foreground">{{ props.help }}</div>
    </div>
    <n-empty v-if="modelValue.length === 0" :description="t('builder.listDropHere')" />
    <n-tabs
      v-else
      :type="(props.type as any) || 'line'"
      :placement="(props.placement as any) || 'top'"
      :size="(props.size as any) || 'small'"
      :animated="props.animated ?? true"
    >
      <n-tab-pane
        v-for="(child, idx) in modelValue"
        :key="child.__key || idx"
        :name="child.__key || idx"
        :tab="tabLabel(child, idx)"
        :closable="paneClosable"
      >
        <div class="w-full grid grid-cols-12 gap-x-4 gap-y-2">
          <FormKitSchema :schema="dslToFormKitSchema(Array.isArray(child.children) ? child.children : [], {})" />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
