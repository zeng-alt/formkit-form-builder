<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, ref, watch } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NEmpty, NStep, NSteps } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { useSchemaRenderData } from '@/composables/use-schema-render-data'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'

const props = defineProps<{
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  help?: string
  size?: string
  status?: string
  vertical?: boolean
}>()

const { t } = useFormBuilderI18n()

const schemaLibrary = getPreviewSchemaLibrary()
// 表单数据 + 表达式 helper：容器内嵌套 FormKitSchema 需要表单数据才能正确求值 visibleIf
const schemaRenderData = useSchemaRenderData()

const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  if (Array.isArray(props.children)) return props.children
  return []
})

const current = ref(0)
watch(
  () => modelValue.value.length,
  (len) => {
    if (len <= 0) current.value = 0
    else if (current.value > len - 1) current.value = len - 1
  },
  { immediate: true },
)

const stepTitle = (child: SchemaNode, idx: number) => {
  const label = child?.label ?? child?.props?.label
  if (typeof label === 'string' && label.trim()) return label.trim()
  const name = child?.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  return `Step ${idx + 1}`
}

// step 内容由 formatContainer（规格 dataShape:objectOfObjects）包装为单个 group，
// 空 step 的 group 无子节点，据此判断是否有真实内容
const paneChildren = (child: SchemaNode) => schemaChildren(child)

const hasPaneContent = (child: SchemaNode) =>
  paneChildren(child).some((node) => schemaChildren(node).length > 0)
</script>

<template>
  <div class="w-full">
    <div v-if="props.label || props.help" class="flex flex-col gap-0.5 mb-2">
      <div v-if="props.label" class="text-sm font-medium">{{ props.label }}</div>
      <div v-if="props.help" class="text-xs text-muted-foreground">{{ props.help }}</div>
    </div>
    <n-empty v-if="modelValue.length === 0" :description="t('builder.listDropHere')" />
    <template v-else>
      <!-- status/size 同 TabsContainerPreview.vue：本组件自己的 string prop 比 naive-ui
           对应 prop 的字面量联合更宽，两边类型来源不同，保留断言 -->
      <n-steps
        :current="current + 1"
        :status="(props.status as any) || 'process'"
        :size="(props.size as any) || 'small'"
        :vertical="props.vertical"
        @update:current="(v: number) => (current = v - 1)"
      >
        <n-step
          v-for="(child, idx) in modelValue"
          :key="child?.__key || idx"
          :title="stepTitle(child, idx)"
          :description="child?.description"
        />
      </n-steps>

      <!-- 内容区：所有 step 保持挂载（display 切换），避免切换步骤时丢失已填数据（同 tabs 的 show:lazy） -->
      <div class="mt-4">
        <div
          v-for="(child, idx) in modelValue"
          :key="child?.__key || idx"
          :style="{ display: idx === current ? '' : 'none' }"
        >
          <FormKitSchema
            v-if="hasPaneContent(child)"
            :schema="paneChildren(child)"
            :library="schemaLibrary"
            :data="schemaRenderData"
          />
          <n-empty v-else :description="t('builder.listDropHere')" />
        </div>
      </div>
    </template>
  </div>
</template>
