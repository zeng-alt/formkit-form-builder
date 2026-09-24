<script setup lang="ts">
import { computed } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import ContainerChildrenGrid from '../shared/ContainerChildrenGrid.vue'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import { collectSchemaNames, duplicateNode } from '@/utils/dnd/schema'

// 所属 FormBuilder 实例状态：选中高亮绑定到各自画布实例。
const { selectedKey, formSchema } = useFormBuilderState()

const props = defineProps<{
  collapseKey?: string
  modelValue: FormKitSchemaFormKit[]
  label?: string
  disabled?: boolean
  defaultExpanded?: boolean
  disableCollapse?: boolean
  bordered?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormKitSchemaFormKit[]): void
  (e: 'select', key: string): void
}>()

const { t } = useFormBuilderI18n()

const initial = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))
const canvasCtx = useCanvasSchemaContext()

const title = computed(() =>
  typeof props.label === 'string' && props.label.trim()
    ? props.label.trim()
    : t('elements.collapse.name'),
)
const bordered = computed<boolean>(() => props.bordered ?? true)
const defaultExpanded = computed<boolean>(() => props.defaultExpanded ?? true)

const dnd = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: initial,
  onUpdateModelValue: (value) => {
    const k = props.collapseKey
    if (k && canvasCtx?.updateContainerChildren) canvasCtx.updateContainerChildren(k, value)
    else emit('update:modelValue', value)
  },
  containerLabel: () => title.value,
})

const onSelect = (child: any, _index: number) => {
  const key = child?.__key as string | undefined
  if (!key) return
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(key)
  else emit('select', key)
}

const deleteChild = (index: number) => {
  const next = dnd.items.value.filter((_, i) => i !== index)
  dnd.items.value = next
  dnd.emitUpdate()
}

const duplicateChild = (index: number) => {
  const source = dnd.items.value[index]
  if (!source) return
  const names = new Set<string>()
  collectSchemaNames(formSchema.value, names)
  const clone = duplicateNode(source, names, { labelSuffix: t('common.copySuffix') })
  const next = [...dnd.items.value]
  next.splice(index + 1, 0, clone)
  dnd.items.value = next
  dnd.emitUpdate()
  // H6：复制完成后选中新副本
  if (canvasCtx?.selectByKey && clone.__key) canvasCtx.selectByKey(clone.__key)
}
</script>

<template>
  <!-- 画布上始终展开（方便拖入 / 排序子字段）：折叠/展开只在运行时预览（
       CollapseContainerPreview.vue）生效，这里只用箭头 + 「默认收起」标签
       提示运行时的初始状态，标题行本身不可点击。 -->
  <div class="w-full rounded-md" :class="bordered ? 'border border-solid border-input' : ''">
    <div
      class="flex items-center gap-1.5 px-2.5 py-2"
      :class="bordered ? 'border-b border-b-solid border-input' : ''"
    >
      <span class="i-lucide-chevron-down h-3.5 w-3.5 text-muted-foreground shrink-0"></span>
      <span class="text-sm font-medium truncate flex-1 min-w-0">{{ title }}</span>
      <span
        v-if="!defaultExpanded"
        class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
      >
        {{ t('edits.collapse.defaultCollapsedTag') }}
      </span>
    </div>
    <div class="p-2">
      <ContainerChildrenGrid
        :container-ref="dnd.containerRef"
        :items="dnd.items"
        :selected-key="selectedKey"
        :empty-text="t('builder.listDropHere')"
        :delete-aria-label="t('builder.deleteField')"
        :copy-aria-label="t('builder.duplicateField')"
        :copy-tooltip-text="t('builder.duplicateField')"
        :resize-aria-label="t('builder.resizeFieldWidth')"
        :show-delete-tooltip="true"
        :delete-tooltip-text="t('builder.deleteField')"
        :data-attrs="{ 'data-collapse-key': props.collapseKey }"
        :set-nested-parent-on-root="dnd.setNestedParentOnRoot"
        :on-select="onSelect"
        :on-delete="deleteChild"
        :on-copy="duplicateChild"
        :on-resize-end="dnd.emitUpdate"
      />
    </div>
  </div>
</template>
