<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NEmpty, NTabPane, NTabs } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { useSchemaRenderData } from '@/composables/use-schema-render-data'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'

const props = defineProps<{
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  help?: string
  type?: string
  placement?: string
  size?: string
  animated?: boolean
  closable?: boolean
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

const tabLabel = (child: SchemaNode, idx: number) => {
  const label = child?.label ?? child?.props?.label
  if (typeof label === 'string' && label.trim()) return label.trim()
  const name = child?.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  return `Tab ${idx + 1}`
}

const paneClosable = computed<boolean>(() => Boolean(props.closable ?? false))
</script>

<template>
  <div class="w-full">
    <div v-if="props.label || props.help" class="flex flex-col gap-0.5 mb-2">
      <div v-if="props.label" class="text-sm font-medium">
        {{ props.label }}
      </div>
      <div v-if="props.help" class="text-xs text-muted-foreground">
        {{ props.help }}
      </div>
    </div>
    <n-empty v-if="modelValue.length === 0" :description="t('builder.listDropHere')" />
    <!-- type/placement/size 是本组件自己声明的 string prop（画布 / DSL 侧按普通字符串
         传值，不锁定 naive-ui 的字面量联合），naive-ui 的 NTabs 对应 prop 是更窄的字面量
         联合类型（如 TabsType = 'line'|'card'|'bar'|'segment'）。曾尝试把这几个 prop 直接
         标注为 TabsProps['type'] 等 naive-ui 导出类型以去掉断言，但 Vue 基于类型的
         defineProps 无法解析 naive-ui 这几个类型（经 naive-ui 的 ExtractPublicPropTypes
         包装，属于 Vue 编译期类型解析器不支持的复杂映射类型组合），会静默退化成不做运行时
         校验的 `type: null`——比现状（naive-ui 自己校验/兜底）更差，因此保留类型断言 -->
    <n-tabs
      v-else
      :type="(props.type as any) || 'line'"
      :placement="(props.placement as any) || 'top'"
      :size="(props.size as any) || 'small'"
      :animated="props.animated ?? true"
    >
      <n-tab-pane
        v-for="(child, idx) in modelValue"
        :key="child?.__key || idx"
        :name="child?.__key || idx"
        :tab="tabLabel(child, idx)"
        :closable="paneClosable"
        display-directive="show:lazy"
      >
        <!-- pane 内容由 formatContainer（规格 dataShape:objectOfObjects）包装为单个 group（内含 grid grid-cols-12），
             直接渲染即可，不要再套一层 grid，否则 group 占不到整行、字段 colspan 失效 -->
        <div>
          <FormKitSchema
            v-if="schemaChildren(child).length > 0"
            :schema="schemaChildren(child)"
            :library="schemaLibrary"
            :data="schemaRenderData"
          />
          <n-empty v-else :description="t('builder.listDropHere')" />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
