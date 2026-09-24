<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, ref, watch } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { useSchemaRenderData } from '@/composables/use-schema-render-data'

const props = defineProps<{
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  disabled?: boolean
  defaultExpanded?: boolean
  disableCollapse?: boolean
  bordered?: boolean
}>()

const { t } = useFormBuilderI18n()
const schemaLibrary = getPreviewSchemaLibrary()
// 表单数据 + 表达式 helper：容器内嵌套 FormKitSchema 需要表单数据才能正确求值 visibleIf
const schemaRenderData = useSchemaRenderData()

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim()
    ? props.label.trim()
    : t('elements.collapse.name'),
)
const bordered = computed<boolean>(() => props.bordered ?? true)
const defaultExpanded = computed<boolean>(() => props.defaultExpanded ?? true)
const disableCollapse = computed<boolean>(() => Boolean(props.disableCollapse))

// 初始展开状态按「默认展开」；「禁用折叠」时始终展开且不响应点击
const expanded = ref(defaultExpanded.value || disableCollapse.value)
watch(disableCollapse, (force) => {
  if (force) expanded.value = true
})

function toggle() {
  if (disableCollapse.value) return
  expanded.value = !expanded.value
}

const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  if (Array.isArray(props.children)) return props.children
  return []
})
</script>

<template>
  <div class="w-full rounded-md" :class="bordered ? 'border border-solid border-input' : ''">
    <button
      type="button"
      class="w-full border-0 bg-transparent p-0 text-left text-inherit [font-family:inherit]"
      :class="disableCollapse ? 'cursor-default' : 'cursor-pointer'"
      :disabled="disableCollapse || disabled"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <div
        class="flex w-full items-center gap-1.5 px-2.5 py-2"
        :class="bordered && expanded ? 'border-b border-b-solid border-input' : ''"
      >
        <span
          class="i-lucide-chevron-down h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform"
          :class="expanded ? '' : '-rotate-90'"
        ></span>
        <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ title }}</span>
      </div>
    </button>
    <div v-show="expanded" class="p-2">
      <div class="grid w-full grid-cols-12 gap-x-4 gap-y-2">
        <FormKitSchema
          v-if="modelValue.length"
          :schema="modelValue"
          :library="schemaLibrary"
          :data="schemaRenderData"
        />
      </div>
    </div>
  </div>
</template>
