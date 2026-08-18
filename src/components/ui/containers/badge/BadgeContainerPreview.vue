<script setup lang="ts">
import type { FormKitSchemaFormKit } from '@formkit/core'
import { computed, ref } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { NBadge, NEmpty } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { getPreviewSchemaLibrary } from '@/elements/canvas'
import { useBadgeSupPosition } from '@/composables/use-badge-sup-position'
import { useBadgeValue } from '@/composables/use-badge-value'

const props = defineProps<{
  children?: FormKitSchemaFormKit[]
  modelValue?: FormKitSchemaFormKit[]
  label?: string
  help?: string
  value?: string | number
  max?: number
  dot?: boolean
  show?: boolean
  showZero?: boolean
  processing?: boolean
  type?: string
  color?: string
  offset?: Array<string | number>
}>()

const { t } = useFormBuilderI18n()

const schemaLibrary = getPreviewSchemaLibrary()

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const helpText = computed(() =>
  typeof props.help === 'string' && props.help.trim() ? props.help.trim() : '',
)
const showHeader = computed(() => Boolean(title.value || helpText.value))
const modelValue = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue
  if (Array.isArray(props.children)) return props.children
  return []
})
const hasChild = computed(() => modelValue.value.length > 0)

// 角标定位：徽标容器整行是 12 列网格，子元素只占自己的 col-span，
// 测量子元素右边缘，把角标 left 对齐到子元素右上角。
const badgeWrapRef = ref<HTMLElement | null>(null)
const { supLeft, supTop } = useBadgeSupPosition({
  badgeRef: badgeWrapRef,
  childSelector: '.formkit-outer',
  enabled: hasChild,
  refreshTrigger: modelValue,
})
const badgeStyle = computed(() =>
  supLeft.value || supTop.value
    ? { '--badge-sup-left': supLeft.value, '--badge-sup-top': supTop.value }
    : undefined,
)

const badgeValueRaw = computed(() =>
  typeof props.value === 'string' && props.value.trim() ? props.value.trim() : props.value,
)
const { badgeValue } = useBadgeValue(badgeValueRaw)
const badgeShow = computed<boolean>(() => (props.show ?? true) && hasChild.value)
const badgeDot = computed<boolean>(() => props.dot ?? false)
const badgeShowZero = computed<boolean>(() => props.showZero ?? false)
const badgeProcessing = computed<boolean>(() => props.processing ?? false)
const badgeMax = computed(() =>
  typeof props.max === 'number' && Number.isFinite(props.max) ? props.max : undefined,
)
const badgeType = computed(() => props.type ?? 'error')
const badgeColor = computed(() =>
  typeof props.color === 'string' && props.color.trim() ? props.color.trim() : undefined,
)
const badgeOffset = computed(() =>
  Array.isArray(props.offset) && props.offset.length ? props.offset : undefined,
)
</script>

<template>
  <div class="w-full">
    <div v-if="showHeader" class="flex flex-col gap-0.5 mb-1">
      <div v-if="title" class="text-sm font-medium">{{ title }}</div>
      <div v-if="helpText" class="text-xs text-muted-foreground">{{ helpText }}</div>
    </div>

    <div ref="badgeWrapRef" class="w-full">
      <n-badge
        v-if="hasChild"
        :value="badgeValue"
        :max="badgeMax"
        :dot="badgeDot"
        :show="badgeShow"
        :show-zero="badgeShowZero"
        :processing="badgeProcessing"
        :type="badgeType as any"
        :color="badgeColor"
        :offset="badgeOffset as any"
        :style="badgeStyle"
      >
        <div class="w-full grid grid-cols-12 gap-x-4 gap-y-2">
          <FormKitSchema :schema="modelValue" :library="schemaLibrary" />
        </div>
      </n-badge>

      <div
        v-else
        class="flex w-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-border/50"
      >
        <n-empty :description="t('builder.listDropHere')" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 徽标容器撑满整行（12 列网格）；角标由 --badge-sup-left / --badge-sup-top 定位到子元素右上角 */
:deep(.n-badge) {
  display: block;
  width: 100%;
}
:deep(.n-badge-sup) {
  left: var(--badge-sup-left, 100%) !important;
  /* naive-ui 默认 bottom: calc(100% - 9px) 让 sup 中心对准容器顶边（18px 高的一半），
     减去 --badge-sup-top 把中心下移到子元素顶边 */
  bottom: calc(100% - var(--badge-sup-top, 0px) - 9px) !important;
}
</style>
