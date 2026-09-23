<script setup lang="ts">
import { computed } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import ContainerChildrenGrid from '../shared/ContainerChildrenGrid.vue'
import { collectSchemaNames, duplicateNode } from '@/utils/dnd/schema'

// 单个 pane 的画布内容区：每个 pane 一份独立实例（各自 DnD + ContainerChildrenGrid），
// 放进 NTabPane 里渲染，placement=left/right 时内容与标签栏并排展示，与运行时一致。
// NTabPane 用 display-directive="show:lazy" 让访问过的 pane 保持挂载，本组件随之
// 常驻（不随切换标签销毁重建），DnD 实例只初始化一次。

const props = defineProps<{
  paneKey: string
  children?: FormKitSchemaFormKit[]
}>()

// 所属 FormBuilder 实例状态：选中高亮绑定到各自画布实例。
const { selectedKey, formSchema } = useFormBuilderState()
const { t } = useFormBuilderI18n()
const canvasCtx = useCanvasSchemaContext()

const initial = computed(() => (Array.isArray(props.children) ? props.children : []))

const dnd = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: initial,
  onUpdateModelValue: (value) => {
    if (canvasCtx?.updateContainerChildren) canvasCtx.updateContainerChildren(props.paneKey, value)
  },
})

const onSelect = (child: FormKitSchemaFormKit) => {
  const key = child?.__key
  if (!key) return
  if (canvasCtx?.selectByKey) canvasCtx.selectByKey(key)
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
    :data-attrs="{ 'data-tabs-pane-key': props.paneKey }"
    :set-nested-parent-on-root="dnd.setNestedParentOnRoot"
    :on-select="onSelect"
    :on-delete="deleteChild"
    :on-copy="duplicateChild"
    :on-resize-end="dnd.emitUpdate"
  />
</template>
