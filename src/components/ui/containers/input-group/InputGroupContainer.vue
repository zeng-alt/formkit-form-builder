<script setup lang="ts">
import { computed } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NInputGroup } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import ContainerChildrenGrid from '@/components/ui/containers/shared/ContainerChildrenGrid.vue'

// 所属 FormBuilder 实例状态：选中高亮绑定到各自画布实例。
const { selectedKey } = useFormBuilderState()
import {
  getColSpan,
  setColSpan,
  rebalanceRowSpans,
  stripInputGroupOuterClass,
} from '@/utils/dnd/grid'

const props = defineProps<{
  inputGroupKey?: string
  modelValue: FormKitSchemaFormKit[]
  label?: string
  disabled?: boolean
  help?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: FormKitSchemaFormKit[]): void
  (e: 'select', key: string): void
}>()

const { t } = useFormBuilderI18n()

const initial = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const canvasCtx = useCanvasSchemaContext()

const normalizeChildren = (values: FormKitSchemaFormKit[]) => {
  const list = Array.isArray(values) ? values : []
  if (list.length === 0) return []
  if (list.length === 1) {
    const only = list[0] as any
    setColSpan(only, 12)
    return [stripInputGroupOuterClass(only)]
  }
  // 输入组单行：总 col-span 不得超过 12（一行网格上限），超出按比例缩放。
  // 宽度只记 layout.colspan，内层元素不再带 outerClass 宽度类（w-[xx%]/pt-2）
  rebalanceRowSpans(list, 12)
  return list.map((f: any) => stripInputGroupOuterClass(f))
}

// 输入组单行：当前项 span 最大只能占到 12 - 其余各项之和（至少 1），
// 拖拽放大到总宽 = 12 后无法再向外，只能向左缩小
const inputGroupMaxSpan = (index: number, items: FormKitSchemaFormKit[]) => {
  let sum = 0
  for (let i = 0; i < items.length; i++) {
    if (i === index) continue
    sum += Math.max(1, Math.min(12, getColSpan(items[i])))
  }
  return Math.max(1, 12 - sum)
}

const dnd = useContainerDragAndDrop<FormKitSchemaFormKit>({
  modelValue: initial,
  onUpdateModelValue: (value) => {
    const next = normalizeChildren(value)
    const k = props.inputGroupKey
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
  <div class="w-full rounded-xl border border-border/50">
    <div v-if="showHeader" class="flex flex-col gap-0.5 px-3 py-2 border-b border-border/50">
      <div v-if="title" class="text-12px font-bold">{{ title }}</div>
    </div>

    <div class="p-2">
      <n-input-group class="w-full">
        <ContainerChildrenGrid
          :container-ref="dnd.containerRef"
          :items="dnd.items"
          :selected-key="selectedKey"
          :empty-text="t('builder.listDropHere')"
          :delete-aria-label="t('builder.deleteField')"
          :resize-aria-label="t('builder.resizeFieldWidth')"
          :data-attrs="{
            'data-input-group-key': props.inputGroupKey,
            'data-dnd-axis': 'x',
          }"
          layout="row"
          :set-nested-parent-on-root="dnd.setNestedParentOnRoot"
          :on-select="onSelect"
          :on-delete="deleteChild"
          :on-resize-end="emitUpdateNormalized"
          :max-span-for="inputGroupMaxSpan"
          ul-class="p-0"
        />
      </n-input-group>
    </div>

    <div v-if="helpText" class="text-[11px] text-muted-foreground">
      {{ helpText }}
    </div>
  </div>
</template>

<style scoped>
/* 输入组是单行复合控件（如 输入框 + 按钮）：隐藏字段的 label/help，
   否则字段比按钮高出一截、按钮无法与输入框上下对齐 */
:deep(.n-input-group .formkit-label),
:deep(.n-input-group .formkit-help) {
  display: none;
}

/* 画布上元素宽度由 li 的 col-span 决定：让元素的外框撑满自己的 li（自身宽度），
   忽略 DSL 里遗留的 w-[xx%]（否则多元素均分后输入框只有 li 的一半宽）。
   pt-2 是提交按钮在表单根部的间距约定，输入组内单行时要去掉，保证与输入框对齐 */
:deep(.n-input-group li .formkit-outer) {
  width: 100% !important;
  padding-top: 0 !important;
}
</style>
