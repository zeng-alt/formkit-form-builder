<script setup lang="ts">
import { computed } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NInputGroup } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { selectedKey } from '@/state/form-schema'
import { useContainerDragAndDrop } from '@/builder/composables/use-container-drag-and-drop'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import ContainerChildrenGrid from '@/components/ui/containers/shared/ContainerChildrenGrid.vue'
import { getColSpan } from '@/utils/dnd/grid'

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

const widthClassFromSpan = (span: number) => {
  const safeSpan = Math.max(1, Math.min(12, Math.round(span)))
  const map: Record<number, string> = {
    1: 'w-[8.33%]',
    2: 'w-[16.67%]',
    3: 'w-[25%]',
    4: 'w-[33.33%]',
    5: 'w-[41.67%]',
    6: 'w-[50%]',
    7: 'w-[58.33%]',
    8: 'w-[66.67%]',
    9: 'w-[75%]',
    10: 'w-[83.33%]',
    11: 'w-[91.67%]',
    12: 'w-[100%]',
  }
  return map[safeSpan] ?? 'w-[100%]'
}

const withWidthClass = (field: FormKitSchemaFormKit, span: number) => {
  const currentOuterClass = typeof field.outerClass === 'string' ? field.outerClass : ''
  let classes = currentOuterClass
    .replace(/\bw-\[[^\]]+\]\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  classes = `${classes} ${widthClassFromSpan(span)}`.replace(/\s+/g, ' ').trim()
  return { ...(field as any), outerClass: classes || undefined } as FormKitSchemaFormKit
}

const normalizeChildren = (values: FormKitSchemaFormKit[]) => {
  const list = Array.isArray(values) ? values : []
  if (list.length === 0) return []
  if (list.length === 1) return [withWidthClass(list[0]!, 12)]
  return list.map((f) => {
    const oc = typeof f.outerClass === 'string' ? f.outerClass : ''
    const match = oc.match(/\bw-\[([0-9.]+%)\]\b/)
    if (match?.[1]) {
      const percent = Number.parseFloat(match[1])
      const span = Number.isFinite(percent) ? Math.round((percent / 100) * 12) : getColSpan(f)
      return withWidthClass(f, span)
    }
    const span = getColSpan(f)
    return withWidthClass(f, span)
  })
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

const title = computed(() => (typeof props.label === 'string' && props.label.trim() ? props.label.trim() : ''))
const helpText = computed(() => (typeof props.help === 'string' && props.help.trim() ? props.help.trim() : ''))
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
  <div class="w-full rounded-xl border border-border/50 bg-card/50">
    <div v-if="showHeader" class="flex flex-col gap-0.5 px-3 py-2 border-b border-border/50">
      <div v-if="title" class="text-xs text-muted-foreground">{{ title }}</div>
      <div v-if="helpText" class="text-[11px] text-muted-foreground">{{ helpText }}</div>
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
          :data-attrs="{ 'data-input-group-key': props.inputGroupKey, 'data-dnd-axis': 'x' }"
          layout="row"
          :set-nested-parent-on-root="dnd.setNestedParentOnRoot"
          :on-select="onSelect"
          :on-delete="deleteChild"
          :on-resize-end="emitUpdateNormalized"
          ul-class="p-0"
        />
      </n-input-group>
    </div>
  </div>
</template>
