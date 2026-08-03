<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { FormKitSchema } from '@formkit/vue'
import { NButton, NTooltip, NEmpty } from 'naive-ui'
import { getColSpan, getRowSpan } from '@/utils/dnd/grid'
import { toCanvasSchemaNode } from '@/utils/canvas-schema'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import { pluralize, validationCount } from '@/utils/text'
import { useGridSpanResize } from '@/builder/composables/use-grid-span-resize'

const props = defineProps<{
  containerRef: Ref<unknown>
  items: Ref<FormKitSchemaFormKit[]>
  selectedKey: string | null
  emptyText: string
  deleteAriaLabel: string
  resizeAriaLabel?: string
  dragHandle?: boolean
  dragEnabled?: boolean
  showDeleteTooltip?: boolean
  deleteTooltipText?: string
  dataAttrs?: Record<string, string | number | boolean | undefined>
  ulClass?: string
  layout?: 'grid' | 'row'
  setNestedParentOnRoot?: (active: boolean) => void
  onSelect: (child: FormKitSchemaFormKit, index: number) => void
  onSelectBlank?: () => void
  onDelete: (index: number) => void
  onResizeEnd: () => void
  /** 拖拽调整宽度时的 span 上限（如输入组：当前项 ≤ 12 - 其余项之和） */
  maxSpanFor?: (index: number, items: FormKitSchemaFormKit[]) => number
}>()

const isDragging = ref(false)

const canvasCtx = useCanvasSchemaContext()
const schemaLibrary = computed(() => canvasCtx?.library as any)
const renderSchemaNode = (node: unknown) => {
  return (
    canvasCtx?.renderNode ? canvasCtx.renderNode(node) : toCanvasSchemaNode(node as any)
  ) as any
}

const tailwindSafelist = [
  'col-span-1',
  'col-span-2',
  'col-span-3',
  'col-span-4',
  'col-span-5',
  'col-span-6',
  'col-span-7',
  'col-span-8',
  'col-span-9',
  'col-span-10',
  'col-span-11',
  'col-span-12',
  'w-[8.33%]',
  'w-[16.67%]',
  'w-[25%]',
  'w-[33.33%]',
  'w-[41.67%]',
  'w-[50%]',
  'w-[58.33%]',
  'w-[66.67%]',
  'w-[75%]',
  'w-[83.33%]',
  'w-[91.67%]',
  'w-[100%]',
  'row-span-1',
  'row-span-2',
  'row-span-3',
  'row-span-4',
  'row-span-5',
  'row-span-6',
]
void tailwindSafelist

const { resizingIndex, startResize } = useGridSpanResize({
  items: props.items,
  containerRef: props.containerRef,
  onResizeEnd: props.onResizeEnd,
  maxSpanFor: props.maxSpanFor,
})

const layout = computed(() => props.layout ?? 'grid')
const dragEnabled = computed(() => props.dragEnabled !== false)
const dragHandle = computed(() => props.dragHandle === true)

const baseUlClass = computed(() => {
  if (layout.value === 'row')
    return 'w-full flex-1 flex flex-row flex-nowrap items-stretch gap-0 list-none p-0 m-0 overflow-x-hidden'
  return 'w-full flex-1 grid grid-cols-12 gap-x-4 gap-y-2 list-none p-2 m-0'
})

const emptyPlaceholderClass = computed(() => {
  if (layout.value === 'row')
    return 'w-full min-h-[140px] flex items-center justify-center pointer-events-none'
  return 'col-span-12 min-h-[140px] flex items-center justify-center pointer-events-none'
})

const itemStyle = (child: any) => {
  if (layout.value === 'row') {
    if (props.items.value.length === 1) return { width: '100%', flex: '0 0 auto' }
    // 输入组（row 布局）：按 col-span/12 显示宽度（4 → 33%、6 → 50%）。
    // 仅当历史数据总宽 > 12 时按比例缩放兜底，避免元素溢出容器、右侧按钮被裁掉
    const spans = props.items.value.map((c: any) =>
      Math.max(1, Math.min(12, getColSpan(c))),
    )
    const totalSpan = spans.reduce((a, b) => a + b, 0) || 1
    const span = Math.max(1, Math.min(12, getColSpan(child)))
    const pct = totalSpan > 12 ? (span / totalSpan) * 100 : (span / 12) * 100
    return { width: `${pct}%`, flex: '0 0 auto' }
  }
  return {
    gridColumn: `span ${getColSpan(child)} / span ${getColSpan(child)}`,
    gridRow: `span ${getRowSpan(child)} / span ${getRowSpan(child)}`,
  }
}

const resizeHandleClass = computed(() => {
  if (layout.value === 'row') return 'absolute top-2 right-1 z-30'
  return 'absolute top-1/2 -translate-y-1/2 -right-3 z-30'
})
</script>

<template>
  <div
    :class="['relative w-full flex flex-col flex-1 min-h-0', layout === 'row' ? 'min-w-0' : '']"
    @pointerdown.self="props.onSelectBlank?.()"
  >
    <ul
      :ref="props.containerRef"
      :class="[
        baseUlClass,
        props.ulClass,
        props.items.value.length === 0 ? 'min-h-[140px] bg-muted/20 rounded-lg' : '',
        layout === 'row' && props.items.value.length === 0 ? 'items-center justify-center' : '',
      ]"
      v-bind="props.dataAttrs"
      @pointerdown.self="props.onSelectBlank?.()"
      @dragover.capture="props.setNestedParentOnRoot?.(true)"
      @dragstart.capture="isDragging = true"
      @dragend.capture="((isDragging = false), props.setNestedParentOnRoot?.(false))"
      @drop="((isDragging = false), props.setNestedParentOnRoot?.(false))"
    >
      <li v-if="props.items.value.length === 0" :class="emptyPlaceholderClass">
        <n-empty :description="props.emptyText" />
      </li>
      <li
        v-for="(child, idx) in props.items.value"
        :key="(child as any)?.__key || child.name || `${child.$formkit}-${idx}`"
        data-canvas-item="true"
        :class="[
          'group rounded-xl transition-[border-color,background-color,box-shadow] duration-150',
          'px-2 py-1 pr-4 h-full !z-20 relative border-[1.5px] min-w-0 box-border',
          dragEnabled ? (dragHandle ? '!cursor-default' : '!cursor-grab') : '!cursor-default',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a277ff] focus-visible:ring-offset-2',
          (child as any)?.__key && (child as any).__key === props.selectedKey
            ? 'border-solid border-[#a277ff] bg-[#a277ff]/[0.05] shadow-[0_0_0_3px_rgba(79,110,247,0.12)] dark:bg-[#a277ff]/[0.08]'
            : 'border-dashed border-transparent hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]',
        ]"
        :style="itemStyle(child)"
        tabindex="0"
        @pointerdown.stop="props.onSelect(child, idx)"
        @keydown.enter.stop.prevent="props.onSelect(child, idx)"
        @keydown.space.stop.prevent="props.onSelect(child, idx)"
      >
        <button
          v-if="dragEnabled && dragHandle"
          type="button"
          tabindex="-1"
          aria-label="Drag to reorder"
          draggable="false"
          data-dnd-handle="true"
          class="absolute top-2 left-2 z-40 text-muted-foreground/70 hover:text-muted-foreground !cursor-grab"
        >
          <span aria-hidden="true" class="i-lucide-grip-vertical h-4 w-4"></span>
        </button>
        <div class="flex gap-1.5 p-1 w-full pb-2">
          <div class="flex-1 w-full min-w-0">
            <FormKitSchema
              :schema="[renderSchemaNode(child)]"
              :library="schemaLibrary"
              :key="`container-child-${idx}`"
            />
          </div>
        </div>

        <div class="absolute bottom-2 right-2 flex flex-row z-40">
          <div
            v-if="(child as any)?.__key && (child as any).__key === props.selectedKey"
            class="px-2 mr-1 border-1 border-ring/40 dark:border-ring/20 rounded-md flex items-center justify-center"
          >
            <span class="text-xs">
              {{ validationCount(child) }} {{ pluralize(validationCount(child), 'rule') }}
            </span>
          </div>

          <n-tooltip v-if="props.showDeleteTooltip" placement="top">
            <template #trigger>
              <n-button
                quaternary
                size="small"
                :aria-label="props.deleteAriaLabel"
                draggable="false"
                @pointerdown.stop.prevent
                @click.stop="props.onDelete(idx)"
                class="!h-[26px] !w-[26px] !rounded-[7px] !text-muted-foreground hover:!bg-red-100 hover:!text-red-600 active:!scale-95 active:!bg-red-200 active:!text-red-700 dark:hover:!bg-red-950/50 dark:hover:!text-red-400 transition-[transform,background-color,color,opacity] duration-150"
              >
                <template #icon
                  ><span aria-hidden="true" class="i-lucide-trash-2 !h-[13px] !w-[13px]"></span
                ></template>
              </n-button>
            </template>
            {{ props.deleteTooltipText }}
          </n-tooltip>

          <n-button
            v-else
            quaternary
            size="small"
            :aria-label="props.deleteAriaLabel"
            draggable="false"
            @pointerdown.stop.prevent
            @click.stop="props.onDelete(idx)"
            class="!h-[26px] !w-[26px] !rounded-[7px] !text-muted-foreground hover:!bg-red-100 hover:!text-red-600 active:!scale-95 active:!bg-red-200 active:!text-red-700 dark:hover:!bg-red-950/50 dark:hover:!text-red-400 transition-[transform,background-color,color,opacity] duration-150"
          >
            <template #icon
              ><span aria-hidden="true" class="i-lucide-trash-2 !h-[13px] !w-[13px]"></span
            ></template>
          </n-button>
        </div>

        <n-button
          text
          size="small"
          :aria-label="props.resizeAriaLabel ?? 'Resize'"
          :class="[
            resizeHandleClass,
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            'transition-[transform,opacity] duration-150',
            '!cursor-ew-resize',
            resizingIndex === idx
              ? '!opacity-100 scale-110'
              : isDragging
                ? '!opacity-0 !pointer-events-none'
                : '',
          ]"
          content-class="!cursor-ew-resize"
          @pointerdown.stop.prevent="startResize($event, idx)"
        >
          <template #icon>
            <span aria-hidden="true" class="i-lucide-more-vertical h-5 w-5"></span>
          </template>
        </n-button>

        <div
          v-if="resizingIndex === idx"
          class="absolute inset-0 z-40 bg-[#a277ff]/[0.06] flex items-center justify-center rounded-xl border-[1.5px] border-[#a277ff]/50"
        >
          <span
            class="bg-[#a277ff] text-white text-xs font-medium px-2.5 py-1 rounded-lg tracking-wide"
          >
            {{ getColSpan(child) }}
          </span>
        </div>
      </li>
    </ul>
  </div>
</template>
