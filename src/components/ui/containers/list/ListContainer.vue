<script setup lang="ts">
import { computed } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NButton, NButtonGroup, NTooltip } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import ContainerChildrenGrid from '../shared/ContainerChildrenGrid.vue'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import { collectSchemaNames, duplicateNode } from '@/utils/dnd/schema'

// 所属 FormBuilder 实例状态：选中高亮绑定到各自画布实例。
const { selectedKey, formSchema } = useFormBuilderState()

const props = defineProps<{
  listKey?: string
  modelValue: FormKitSchemaFormKit[]
  label?: string
  disabled?: boolean
  showActions?: boolean
  bordered?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormKitSchemaFormKit[]): void
  (e: 'duplicate'): void
  (e: 'remove'): void
  (e: 'select', key: string): void
}>()

const { t } = useFormBuilderI18n()

const initial = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const listKey = computed(() => props.listKey ?? '')

const canvasCtx = useCanvasSchemaContext()

// 列表容器只能容纳一个子元素（列表项模板，通常是一个 group）：
// 已满时拒绝新元素进入；容器内唯一子项的重排/拖出再放回（同 __key）放行。
const acceptsListChild = (value: unknown): boolean => {
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
  accepts: acceptsListChild,
  onUpdateModelValue: (value) => {
    const next = normalizeChildren(value)
    const k = listKey.value
    if (k && canvasCtx?.updateContainerChildren) canvasCtx.updateContainerChildren(k, next)
    else emit('update:modelValue', next)
  },
})

const emitUpdateNormalized = () => {
  const next = normalizeChildren(dnd.items.value)
  dnd.items.value = next
  dnd.emitUpdate()
}

// 列表已满（已有 1 个子项）时隐藏复制按钮，避免复制后被归一化截断成无效操作
const canCopy = computed(() => dnd.items.value.length < 1)

const showActions = computed(() => props.showActions === true)
const bordered = computed<boolean>(() => props.bordered ?? true)
const title = computed(() =>
  typeof props.label === 'string' && props.label.trim() ? props.label.trim() : '',
)
const showHeader = computed(() => !!title.value || showActions.value)

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

const duplicateChild = (index: number) => {
  const source = dnd.items.value[index]
  if (!source) return
  const names = new Set<string>()
  collectSchemaNames(formSchema.value as any, names)
  const clone = duplicateNode(source, names)
  const next = [...dnd.items.value]
  next.splice(index + 1, 0, clone)
  dnd.items.value = next
  emitUpdateNormalized()
}
</script>

<template>
  <div :class="['w-full rounded-xl', bordered ? 'border border-border/50' : '']">
    <div
      v-if="showHeader"
      :class="[
        'flex items-center justify-between px-3 py-2',
        bordered ? 'border-b border-border/50' : '',
      ]"
    >
      <div v-if="title" class="text-12px font-bold">{{ title }}</div>
      <n-button-group v-if="showActions">
        <n-tooltip placement="top">
          <template #trigger>
            <n-button quaternary size="small" :disabled="disabled" @click.stop="emit('duplicate')">
              <template #icon><span class="i-lucide-plus h-4 w-4"></span></template>
            </n-button>
          </template>
          {{ t('builder.listAdd') }}
        </n-tooltip>
        <n-tooltip placement="top">
          <template #trigger>
            <n-button quaternary size="small" :disabled="disabled" @click.stop="emit('remove')">
              <template #icon><span class="i-lucide-trash-2 h-4 w-4"></span></template>
            </n-button>
          </template>
          {{ t('builder.listRemove') }}
        </n-tooltip>
      </n-button-group>
    </div>

    <div class="p-2">
      <ContainerChildrenGrid
        :container-ref="dnd.containerRef"
        :items="dnd.items"
        :selected-key="selectedKey"
        :empty-text="t('builder.listDropHere')"
        :delete-aria-label="t('builder.deleteField')"
        :copy-aria-label="t('builder.duplicateField')"
        :resize-aria-label="t('builder.resizeFieldWidth')"
        :data-attrs="{ 'data-list-key': listKey }"
        :set-nested-parent-on-root="dnd.setNestedParentOnRoot"
        :on-select="onSelect"
        :on-delete="deleteChild"
        :on-copy="canCopy ? duplicateChild : undefined"
        :on-resize-end="emitUpdateNormalized"
      />
    </div>
  </div>
</template>
