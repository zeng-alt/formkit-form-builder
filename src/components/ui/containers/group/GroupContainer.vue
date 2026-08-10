<script setup lang="ts">
import { computed } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import ContainerChildrenGrid from '../shared/ContainerChildrenGrid.vue'
import { collectSchemaNames, duplicateNode } from '@/utils/dnd/schema'

// 所属 FormBuilder 实例状态：选中高亮绑定到各自画布实例。
const { selectedKey, formSchema } = useFormBuilderState()

// group 容器（对应 FormKit 原生 $formkit: 'group'）：嵌套 object 数据结构。
// 画布上以虚线框承载子字段，预览时由 formatContainer（规格 primitive:group）还原为原生 FormKit group。
const props = defineProps<{
  groupKey?: string
  modelValue: FormKitSchemaFormKit[]
  name?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormKitSchemaFormKit[]): void
  (e: 'select', key: string): void
}>()

const { t } = useFormBuilderI18n()

const initial = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const canvasCtx = useCanvasSchemaContext()

const dnd = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: initial,
  onUpdateModelValue: (value) => {
    const k = props.groupKey
    if (k && canvasCtx?.updateContainerChildren) canvasCtx.updateContainerChildren(k, value)
    else emit('update:modelValue', value)
  },
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
  collectSchemaNames(formSchema.value as any, names)
  const clone = duplicateNode(source, names)
  const next = [...dnd.items.value]
  next.splice(index + 1, 0, clone)
  dnd.items.value = next
  dnd.emitUpdate()
}
</script>

<template>
  <div :class="['w-full rounded-xl bg-card/40']">
    <div class="p-1">
      <ContainerChildrenGrid
        :container-ref="dnd.containerRef"
        :items="dnd.items"
        :selected-key="selectedKey"
        :empty-text="t('builder.listDropHere')"
        :delete-aria-label="t('builder.deleteField')"
        :copy-aria-label="t('builder.duplicateField')"
        :resize-aria-label="t('builder.resizeFieldWidth')"
        :data-attrs="{ 'data-group-key': props.groupKey }"
        :set-nested-parent-on-root="dnd.setNestedParentOnRoot"
        :on-select="onSelect"
        :on-delete="deleteChild"
        :on-copy="duplicateChild"
        :on-resize-end="dnd.emitUpdate"
      />
    </div>
  </div>
</template>
