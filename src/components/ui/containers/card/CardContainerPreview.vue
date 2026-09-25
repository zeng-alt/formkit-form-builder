<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NCard, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { useSchemaRenderData } from '@/composables/use-schema-render-data'

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
// 表单数据 + 表达式 helper：容器内嵌套 FormKitSchema 需要表单数据才能正确求值 visibleIf
const schemaRenderData = useSchemaRenderData()

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
  <!-- size 同 TabsContainerPreview.vue：本组件自己的 size prop 是宽泛 string，
       naive-ui NCard 的 size 是更窄的字面量联合，两边类型来源不同。曾尝试标注为
       CardProps['size']，但 Vue 的类型解析器无法解析 naive-ui 经 ExtractPublicPropTypes
       包装的类型，会静默退化成不做运行时校验的 `type: null`，故保留断言 -->
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
      <FormKitSchema
        v-if="modelValue.length"
        :schema="modelValue"
        :library="schemaLibrary"
        :data="schemaRenderData"
      />
      <div v-else class="col-span-12 flex min-h-[120px] items-center justify-center">
        <n-empty :description="t('builder.listDropHere')" />
      </div>
    </div>
  </n-card>
</template>
