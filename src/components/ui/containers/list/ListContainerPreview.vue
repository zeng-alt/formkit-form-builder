<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { inject, computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NButton, NButtonGroup, NTooltip, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/containers/registry'

const props = defineProps<{
  nodeKey?: string
  listKey?: string
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  isPlaceholder?: boolean
}>()

const duplicate = inject('previewListDuplicate', null as unknown as ((key: string) => void) | null)
const isLast = inject('previewListIsLast', null as unknown as ((key: string) => boolean) | null)
const remove = inject('previewListRemove', null as unknown as ((key: string) => void) | null)
const restore = inject('previewListRestore', null as unknown as ((key: string) => void) | null)

const { t } = useFormBuilderI18n()

const schemaLibrary = getPreviewSchemaLibrary()

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const showHeader = computed(() => !!title.value || props.isPlaceholder !== true)
const nodeKey = computed(() => props.nodeKey ?? props.listKey ?? '')
const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  if (Array.isArray(props.children)) return props.children
  return []
})
const canRemove = computed(() => props.isPlaceholder !== true && typeof remove === 'function')
const canRestore = computed(() => props.isPlaceholder === true && typeof restore === 'function')
const canDuplicate = computed(
  () =>
    props.isPlaceholder !== true &&
    typeof duplicate === 'function' &&
    (isLast ? isLast(nodeKey.value) : true),
)
const showAddButton = computed(() => canDuplicate.value)
const wrapperClass = computed(() => (showAddButton.value ? 'p-2 relative pb-10' : 'p-2'))
</script>

<template>
  <div class="w-full rounded-xl border border-border/50 bg-card/50">
    <div
      v-if="showHeader"
      class="flex items-center justify-between px-3 py-2 border-b border-border/50"
    >
      <div v-if="title" class="text-xs text-muted-foreground">{{ title }}</div>
      <n-button-group v-if="canRemove" class="shrink-0">
        <n-tooltip placement="top">
          <template #trigger>
            <n-button quaternary size="small" @click.stop="remove?.(nodeKey)">
              <template #icon><span class="i-lucide-trash-2 h-4 w-4"></span></template>
            </n-button>
          </template>
          {{ t('builder.listRemove') }}
        </n-tooltip>
      </n-button-group>
    </div>

    <div :class="wrapperClass">
      <div
        v-if="props.isPlaceholder === true"
        class="min-h-[140px] flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-3">
          <n-empty :description="t('builder.listRemove')" />
          <n-button v-if="canRestore" secondary @click="restore?.(nodeKey)">
            <template #icon><span class="i-lucide-plus h-4 w-4"></span></template>
            {{ t('builder.addListContainer') }}
          </n-button>
        </div>
      </div>
      <div v-else class="w-full grid grid-cols-12 gap-x-4 gap-y-2">
        <FormKitSchema v-if="modelValue.length" :schema="modelValue" :library="schemaLibrary" />
        <n-empty v-else :description="t('builder.listDropHere')" />
      </div>
      <div v-if="showAddButton" class="absolute bottom-2 left-2">
        <n-tooltip placement="top">
          <template #trigger>
            <n-button quaternary size="small" @click.stop="duplicate?.(nodeKey)">
              <template #icon><span class="i-lucide-plus h-4 w-4"></span></template>
            </n-button>
          </template>
          {{ t('builder.listAdd') }}
        </n-tooltip>
      </div>
    </div>
  </div>
</template>
