<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NBadge } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import { useBadgeSupPosition } from '@/composables/use-badge-sup-position'
import { useBadgeValue } from '@/composables/use-badge-value'
import ContainerChildrenGrid from '../shared/ContainerChildrenGrid.vue'

// 所属 FormBuilder 实例状态：选中高亮绑定到各自画布实例。
const { selectedKey } = useFormBuilderState()

// 徽标容器（NBadge）：只允许拖入一个元素，徽标角标挂在唯一子元素上。
const props = defineProps<{
  badgeKey?: string
  modelValue: FormKitSchemaFormKit[]
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

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormKitSchemaFormKit[]): void
  (e: 'select', key: string): void
}>()

const { t } = useFormBuilderI18n()

const initial = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const canvasCtx = useCanvasSchemaContext()

// 徽标只能容纳一个元素：已满时拒绝新元素进入；
// 容器内唯一子项的重排/拖出再放回（同 __key）放行。
const acceptsBadgeChild = (value: unknown): boolean => {
  if (dnd.items.value.length < 1) return true
  const v = value as { __key?: unknown } | null | undefined
  const key = typeof v?.__key === 'string' ? v.__key : undefined
  if (key) return dnd.items.value.some((c: any) => c?.__key === key)
  return false
}

const normalizeChildren = (values: FormKitSchemaFormKit[]) => {
  const list = Array.isArray(values) ? values : []
  // 兜底：只保留第一个元素，保证单元素约束
  return list.slice(0, 1)
}

const dnd = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: initial,
  accepts: acceptsBadgeChild,
  onUpdateModelValue: (value) => {
    const next = normalizeChildren(value)
    const k = props.badgeKey
    if (k && canvasCtx?.updateContainerChildren) canvasCtx.updateContainerChildren(k, next)
    else emit('update:modelValue', next)
  },
})

const emitUpdateNormalized = () => {
  const next = normalizeChildren(dnd.items.value)
  dnd.items.value = next
  dnd.emitUpdate()
}

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const helpText = computed(() =>
  typeof props.help === 'string' && props.help.trim() ? props.help.trim() : '',
)
const showHeader = computed(() => Boolean(title.value || helpText.value))
// 空容器（还没有子元素）不显示角标，拖入首个元素后才按配置展示
const hasChild = computed(() => dnd.items.value.length > 0)

// 角标定位：徽标容器整行是 12 列网格，子元素只占自己的 col-span，
// 测量子元素右边缘，把角标 left 对齐到子元素右上角（而非容器外沿）。
const badgeWrapRef = ref<HTMLElement | null>(null)
const { supLeft } = useBadgeSupPosition({
  badgeRef: badgeWrapRef,
  childSelector: 'li[data-canvas-item]',
  enabled: hasChild,
  refreshTrigger: dnd.items,
})
const badgeStyle = computed(() =>
  supLeft.value ? { '--badge-sup-left': supLeft.value } : undefined,
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

const onSelect = (child: any, _index: number) => {
  const key = child?.__key as string | undefined
  if (!key) return
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(key)
  else emit('select', key)
}

const deleteChild = (index: number) => {
  const next = dnd.items.value.filter((_, i) => i !== index)
  dnd.items.value = next
  emitUpdateNormalized()
}
</script>

<template>
  <div class="w-full rounded-xl border border-border/50 bg-card/50">
    <div
      v-if="showHeader"
      class="flex flex-col gap-0.5 px-3 py-2 border-b border-border/50"
    >
      <div v-if="title" class="text-sm font-medium">{{ title }}</div>
      <div v-if="helpText" class="text-xs text-muted-foreground">{{ helpText }}</div>
    </div>

    <div class="p-2">
      <div ref="badgeWrapRef" class="w-full">
        <n-badge
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
          <ContainerChildrenGrid
            :container-ref="dnd.containerRef"
            :items="dnd.items"
            :selected-key="selectedKey"
            :empty-text="t('builder.listDropHere')"
            :delete-aria-label="t('builder.deleteField')"
            :resize-aria-label="t('builder.resizeFieldWidth')"
            :show-delete-tooltip="true"
            :delete-tooltip-text="t('builder.deleteField')"
            :data-attrs="{ 'data-badge-key': props.badgeKey }"
            :set-nested-parent-on-root="dnd.setNestedParentOnRoot"
            :on-select="onSelect"
            :on-delete="deleteChild"
            :on-resize-end="emitUpdateNormalized"
            ul-class="p-1"
          />
        </n-badge>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 徽标容器撑满整行（12 列网格）；角标由 --badge-sup-left 定位到子元素右上角 */
:deep(.n-badge) {
  display: block;
  width: 100%;
}
:deep(.n-badge-sup) {
  left: var(--badge-sup-left, 100%) !important;
}
</style>
