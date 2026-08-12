<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, ref, watch } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NEmpty, NStep, NSteps } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'

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

const stepTitle = (child: any, idx: number) => {
  const label = child?.label ?? child?.props?.label
  if (typeof label === 'string' && label.trim()) return label.trim()
  const name = child?.name
  if (typeof name === 'string' && name.trim()) return name.trim()
  return `Step ${idx + 1}`
}

// step 内容由 formatContainer（规格 dataShape:objectOfObjects）包装为单个 group，
// 空 step 的 group 无子节点，据此判断是否有真实内容
const paneChildren = (child: any) => {
  const c = child?.children
  return Array.isArray(c) ? c : []
}

const hasPaneContent = (child: any) =>
  paneChildren(child).some(
    (node: any) => Array.isArray(node?.children) && node.children.length > 0,
  )
</script>

<template>
  <div class="w-full">
    <div v-if="props.label || props.help" class="flex flex-col gap-0.5 mb-2">
      <div v-if="props.label" class="text-sm font-medium">{{ props.label }}</div>
      <div v-if="props.help" class="text-xs text-muted-foreground">{{ props.help }}</div>
    </div>
    <n-empty v-if="modelValue.length === 0" :description="t('builder.listDropHere')" />
    <template v-else>
      <n-steps
        :current="current + 1"
        :status="(props.status as any) || 'process'"
        :size="(props.size as any) || 'small'"
        :vertical="props.vertical"
        @update:current="(v: number) => (current = v - 1)"
      >
        <n-step
          v-for="(child, idx) in modelValue"
          :key="(child as any)?.__key || idx"
          :title="stepTitle(child, idx)"
          :description="(child as any)?.description"
        />
      </n-steps>

      <!-- 内容区：所有 step 保持挂载（display 切换），避免切换步骤时丢失已填数据（同 tabs 的 show:lazy） -->
      <div class="mt-4">
        <div
          v-for="(child, idx) in modelValue"
          :key="(child as any)?.__key || idx"
          :style="{ display: idx === current ? '' : 'none' }"
        >
          <FormKitSchema
            v-if="hasPaneContent(child)"
            :schema="paneChildren(child)"
            :library="schemaLibrary"
          />
          <n-empty v-else :description="t('builder.listDropHere')" />
        </div>
      </div>
    </template>
  </div>
</template>
