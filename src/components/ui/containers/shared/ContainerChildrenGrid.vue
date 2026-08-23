<script setup lang="ts">
import { computed, nextTick, ref, watch, type Ref } from 'vue'
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
  /** 复制按钮的无障碍标签（缺省不渲染复制按钮） */
  copyAriaLabel?: string
  /** 复制按钮 tooltip 文案（配合 showDeleteTooltip 使用） */
  copyTooltipText?: string
  resizeAriaLabel?: string
  dragHandle?: boolean
  dragEnabled?: boolean
  showDeleteTooltip?: boolean
  deleteTooltipText?: string
  dataAttrs?: Record<string, string | number | boolean | undefined>
  ulClass?: string
  layout?: 'grid' | 'row'
  /** row 布局时子项按内容自适应宽度（按钮组）；同时隐藏宽度调节把手 */
  autoWidth?: boolean
  /** row 布局时子项等分宽度占满一行（按钮组默认） */
  equalWidth?: boolean
  /** row 布局时纵向排列（纵向按钮组） */
  vertical?: boolean
  setNestedParentOnRoot?: (active: boolean) => void
  onSelect: (child: FormKitSchemaFormKit, index: number) => void
  onSelectBlank?: () => void
  onDelete: (index: number) => void
  /** 复制：在下方插入相同配置、重新生成 name 的副本 */
  onCopy?: (index: number) => void
  onResizeEnd: () => void
  /** 拖拽调整宽度时的 span 上限（如输入组：当前项 ≤ 12 - 其余项之和） */
  maxSpanFor?: (index: number, items: FormKitSchemaFormKit[]) => number
  /** 空态最小高度（默认 140px；根画布空态可覆盖为 400px） */
  emptyMinHeight?: string
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

// ── 手动 FLIP 动画：排序/重排（items 数量不变但顺序变化）时让元素平滑滑动到新位置。
// 不用 <TransitionGroup> 的 move 类（其 leave 动画会触发 DnD 库的 DOM 数量警告），
// 这里在 DOM 更新前后各测一次位置，对位移的元素施加反向 transform 再过渡回原位。
const FLIP_DURATION_MS = 200
const flipCssVar = '--canvas-item-flip'
let prevFlipRects: Map<string, DOMRect> | null = null

const readChildRects = (): Map<string, DOMRect> => {
  const map = new Map<string, DOMRect>()
  const ul = props.containerRef?.value as HTMLElement | null
  if (!ul) return map
  const items = props.items.value
  for (const li of Array.from(ul.children)) {
    const key = (li as HTMLElement).getAttribute('data-item-key')
    if (!key) continue
    const rect = (li as HTMLElement).getBoundingClientRect()
    map.set(key, rect)
    void items
  }
  return map
}

// 仅在"数量不变"时做 FLIP（纯排序 / 撤销重排）；增删（含清空）时跳过，
// 避免对被删除/新增的节点施加位移，也与 leave 即时移除保持一致。
watch(
  () => props.items.value,
  (next, prev) => {
    if (!prev) return
    prevFlipRects = readChildRects()
    nextTick(() => {
      const prevRects = prevFlipRects
      prevFlipRects = null
      if (!prevRects || next.length !== prev.length) return
      const ul = props.containerRef?.value as HTMLElement | null
      if (!ul) return
      for (const li of Array.from(ul.children) as HTMLElement[]) {
        const key = li.getAttribute('data-item-key')
        if (!key) continue
        const prevRect = prevRects.get(key)
        if (!prevRect) continue
        const nextRect = li.getBoundingClientRect()
        const dx = prevRect.left - nextRect.left
        const dy = prevRect.top - nextRect.top
        if (dx === 0 && dy === 0) continue
        li.style.transform = `translate(${dx}px, ${dy}px)`
        li.style.transition = 'none'
        void li.offsetWidth // 强制 reflow 使起点生效
        li.style.transition = `transform ${FLIP_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
        li.style.transform = ''
      }
      void ul
    })
  },
  { flush: 'pre' },
)
void flipCssVar

const layout = computed(() => props.layout ?? 'grid')
const dragEnabled = computed(() => props.dragEnabled !== false)
const dragHandle = computed(() => props.dragHandle === true)

// 步骤向导节点不提供复制按钮（全局唯一，复制无意义）
const isStepsItem = (child: any): boolean => child?.$cmp === 'steps' || child?.$formkit === 'steps'

const baseUlClass = computed(() => {
  if (layout.value === 'row') {
    if (props.vertical) return 'w-full flex-1 flex flex-col items-start gap-0 list-none p-0 m-0'
    if (props.autoWidth)
      return 'w-full flex-1 flex flex-row flex-nowrap items-center gap-0 list-none p-0 m-0 overflow-x-hidden'
    return 'w-full flex-1 flex flex-row flex-nowrap items-stretch gap-0 list-none p-0 m-0 overflow-x-hidden'
  }
  return 'w-full flex-1 grid grid-cols-12 gap-x-4 gap-y-6 list-none p-2 m-0'
})

const emptyPlaceholderClass = computed(
  () => 'absolute inset-0 flex items-center justify-center pointer-events-none',
)

const itemStyle = (child: any) => {
  if (layout.value === 'row') {
    if (props.autoWidth) return { width: 'auto', flex: '0 0 auto' }
    // 纵向按钮组：column 下 flex-basis 控制的是高度，width:0% 会把宽度压扁，
    // 改为每个按钮占满整列宽度、不纵向拉伸
    if (props.equalWidth && props.vertical) return { width: '100%', flex: '0 0 auto' }
    // 按钮组：子按钮等分整行宽度（有多少个就平分多少）
    if (props.equalWidth) return { flex: '1 1 0%', width: '0%' }
    if (props.items.value.length === 1) return { width: '100%', flex: '0 0 auto' }
    // 输入组（row 布局）：按 col-span/12 显示宽度（4 → 33%、6 → 50%）。
    // 仅当历史数据总宽 > 12 时按比例缩放兜底，避免元素溢出容器、右侧按钮被裁掉
    const spans = props.items.value.map((c: any) => Math.max(2, Math.min(12, getColSpan(c))))
    const totalSpan = spans.reduce((a, b) => a + b, 0) || 1
    const span = Math.max(2, Math.min(12, getColSpan(child)))
    const pct = totalSpan > 12 ? (span / totalSpan) * 100 : (span / 12) * 100
    return { width: `${pct}%`, flex: '0 0 auto' }
  }
  return {
    gridColumn: `span ${getColSpan(child)} / span ${getColSpan(child)}`,
    gridRow: `span ${getRowSpan(child)} / span ${getRowSpan(child)}`,
  }
}

const resizeHandleClass = computed(() => {
  // row 布局：右上角留给删除按钮，调节把手左移一格避免重叠
  if (layout.value === 'row') return 'absolute top-2 right-10 z-30'
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
        'box-border',
        layout === 'row' && props.items.value.length === 0 ? 'items-center justify-center' : '',
      ]"
      :style="
        props.items.value.length === 0 ? { minHeight: props.emptyMinHeight ?? '140px' } : undefined
      "
      v-bind="props.dataAttrs"
      @pointerdown.self="props.onSelectBlank?.()"
      @dragover.capture="props.setNestedParentOnRoot?.(true)"
      @dragstart.capture="isDragging = true"
      @dragend.capture="((isDragging = false), props.setNestedParentOnRoot?.(false))"
      @drop="((isDragging = false), props.setNestedParentOnRoot?.(false))"
    >
      <!-- 普通渲染 + 手动 FLIP：不用 <TransitionGroup>。
           TransitionGroup 的 leave 动画会逐个异步移除 DOM 节点，而 @formkit/drag-and-drop
           的 MutationObserver 要求 DOM 数量与 values 数组始终一致（动画期间数量不匹配会触发
           "does not match the number of values" 警告）。改为：
           - 进入：CSS animation（.canvas-item-enter）
           - 排序/移动：手动 FLIP（watch items → 记录旧位置 → nextTick 后对比 → transform 过渡）
           - 离开：即时移除（无 leave 动画） -->
      <li
        v-for="(child, idx) in props.items.value"
        :key="(child as any)?.__key || child.name || `${child.$formkit}-${idx}`"
        :data-item-key="(child as any)?.__key || child.name || `${child.$formkit}-${idx}`"
        data-canvas-item="true"
        :class="[
          'canvas-item-enter',
          'group rounded-xl transition-[border-color,background-color,box-shadow] duration-150',
          'px-2 py-1 pr-4 h-full !z-20 relative border-[1.5px] min-w-0 box-border',
          dragEnabled ? (dragHandle ? '!cursor-default' : '!cursor-grab') : '!cursor-default',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a277ff] focus-visible:ring-offset-2',
          (child as any)?.__key && (child as any).__key === props.selectedKey
            ? 'border-solid border-[#a277ff] bg-[#a277ff]/[0.05] shadow-[0_0_0_3px_rgba(79,110,247,0.12)] dark:bg-[#a277ff]/[0.08] canvas-item-select-pop'
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

        <!-- 左上角显示元素名称（左对齐，浮在顶边框上方）：悬停（虚线框）或选中（实线框）时显示 -->
        <div
          class="absolute -top-[23px] left-0 z-30 flex h-[22px] max-w-[160px] items-center rounded-[7px] border border-border/70 bg-card px-2 shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-[opacity] duration-150 dark:border-border/50 dark:bg-neutral-900"
          :class="[
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100',
            (child as any)?.__key === props.selectedKey ? '!opacity-100' : '',
          ]"
        >
          <span class="truncate text-[11px] text-muted-foreground">
            {{ (child as any)?.name || (child as any)?.$formkit || (child as any)?.$cmp }}
          </span>
        </div>

        <!-- 悬停延伸区：覆盖复制/删除按钮及其左 8px、连接元素顶边，保证鼠标移向按钮时虚线框不消失 -->
        <span aria-hidden="true" class="absolute -top-[23px] right-0 z-30 h-[23px] w-[52px]"></span>

        <!-- 复制按钮：删除按钮左侧，浮在顶边框上方 -->
        <n-tooltip
          v-if="props.onCopy && props.showDeleteTooltip && !isStepsItem(child)"
          placement="top"
        >
          <template #trigger>
            <n-button
              quaternary
              size="small"
              :aria-label="props.copyAriaLabel"
              draggable="false"
              @pointerdown.stop.prevent
              @click.stop="props.onCopy?.(idx)"
              :class="[
                'absolute -top-[23px] right-[22px] z-40 !h-[22px] !w-[22px] !rounded-[7px] !border !border-border/70 !shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:!bg-[#7c9ef8]/25 hover:!text-[#4f6ef7] active:!scale-95 active:!bg-[#7c9ef8]/35 active:!text-[#4f6ef7] dark:!border-border/50 dark:hover:!bg-[#7c9ef8]/30 transition-[transform,background-color,color,opacity] duration-150',
                'opacity-0 pointer-events-none',
                'group-hover:opacity-100 group-hover:pointer-events-auto',
                (child as any)?.__key === props.selectedKey
                  ? '!bg-[#a277ff]/15 !text-[#a277ff] !opacity-100 !pointer-events-auto'
                  : '!bg-[#7c9ef8]/10 !text-[#4f6ef7]',
              ]"
            >
              <template #icon
                ><span aria-hidden="true" class="i-lucide-copy !h-[12px] !w-[12px]"></span
              ></template>
            </n-button>
          </template>
          {{ props.copyTooltipText }}
        </n-tooltip>

        <n-button
          v-if="props.onCopy && !props.showDeleteTooltip && !isStepsItem(child)"
          quaternary
          size="small"
          :aria-label="props.copyAriaLabel"
          draggable="false"
          @pointerdown.stop.prevent
          @click.stop="props.onCopy?.(idx)"
          :class="[
            'absolute -top-[23px] right-[22px] z-40 !h-[22px] !w-[22px] !rounded-[7px] !border !border-border/70 !shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:!bg-[#7c9ef8]/25 hover:!text-[#4f6ef7] active:!scale-95 active:!bg-[#7c9ef8]/35 active:!text-[#4f6ef7] dark:!border-border/50 dark:hover:!bg-[#7c9ef8]/30 transition-[transform,background-color,color,opacity] duration-150',
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            (child as any)?.__key === props.selectedKey
              ? '!bg-[#a277ff]/15 !text-[#a277ff] !opacity-100 !pointer-events-auto'
              : '!bg-[#7c9ef8]/10 !text-[#4f6ef7]',
          ]"
        >
          <template #icon
            ><span aria-hidden="true" class="i-lucide-copy !h-[12px] !w-[12px]"></span
          ></template>
        </n-button>

        <!-- 删除按钮浮在右上角边框外侧（与边框留间距，不相连）：悬停（虚线框）或选中（实线框）时显示 -->
        <n-tooltip v-if="props.showDeleteTooltip" placement="top">
          <template #trigger>
            <n-button
              quaternary
              size="small"
              :aria-label="props.deleteAriaLabel"
              draggable="false"
              @pointerdown.stop.prevent
              @click.stop="props.onDelete(idx)"
              :class="[
                'absolute -top-[23px] right-0 z-40 !h-[22px] !w-[22px] !rounded-[7px] !border !border-border/70 !shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:!bg-red-100 hover:!text-red-600 active:!scale-95 active:!bg-red-200 active:!text-red-700 dark:!border-border/50 dark:hover:!bg-red-950/50 dark:hover:!text-red-400 transition-[transform,background-color,color,opacity] duration-150',
                'opacity-0 pointer-events-none',
                'group-hover:opacity-100 group-hover:pointer-events-auto',
                (child as any)?.__key === props.selectedKey
                  ? '!bg-[#a277ff]/15 !text-[#a277ff] !opacity-100 !pointer-events-auto'
                  : '!bg-[#7c9ef8]/10 !text-[#4f6ef7]',
              ]"
            >
              <template #icon
                ><span aria-hidden="true" class="i-lucide-trash-2 !h-[12px] !w-[12px]"></span
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
          :class="[
            'absolute -top-[23px] right-0 z-40 !h-[22px] !w-[22px] !rounded-[7px] !border !border-border/70 !shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:!bg-red-100 hover:!text-red-600 active:!scale-95 active:!bg-red-200 active:!text-red-700 dark:!border-border/50 dark:hover:!bg-red-950/50 dark:hover:!text-red-400 transition-[transform,background-color,color,opacity] duration-150',
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            (child as any)?.__key === props.selectedKey
              ? '!bg-[#a277ff]/15 !text-[#a277ff] !opacity-100 !pointer-events-auto'
              : '!bg-[#7c9ef8]/10 !text-[#4f6ef7]',
          ]"
        >
          <template #icon
            ><span aria-hidden="true" class="i-lucide-trash-2 !h-[12px] !w-[12px]"></span
          ></template>
        </n-button>

        <div class="absolute bottom-2 right-2 flex flex-row z-40">
          <div
            v-if="(child as any)?.__key && (child as any).__key === props.selectedKey"
            class="px-2 mr-1 border-1 border-ring/40 dark:border-ring/20 rounded-md flex items-center justify-center"
          >
            <span class="text-xs">
              {{ validationCount(child) }} {{ pluralize(validationCount(child), 'rule') }}
            </span>
          </div>
        </div>

        <n-button
          v-if="!props.autoWidth && !props.equalWidth"
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

    <div v-if="props.items.value.length === 0" :class="emptyPlaceholderClass">
      <slot name="empty">
        <div class="w-full h-full flex items-center justify-center">
          <n-empty :description="props.emptyText" />
        </div>
      </slot>
    </div>
  </div>
</template>

<style scoped>
/* 画布条目进入动画：拖入 / 复制 / 撤销恢复时淡入 + 轻微上浮回位。
   用元素挂载时自动播放的 animation（而非 TransitionGroup 的 enter-from/enter-active），
   配合上方手动 FLIP 实现排序移动动画，同时避免 DnD 库因 TransitionGroup 的
   leave 动画期间 DOM 与 values 数量不一致而告警。 */
.canvas-item-enter {
  animation: canvas-item-enter 180ms ease-out;
}
@keyframes canvas-item-enter {
  from {
    opacity: 0;
    transform: scale(0.98) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
/* 选中：一次性紫色 ring 扩散提示，结束后回落到常规选中阴影 */
@keyframes canvas-item-select-pop {
  0% {
    box-shadow: 0 0 0 0 rgba(162, 119, 255, 0.45);
  }
  100% {
    box-shadow: 0 0 0 14px rgba(162, 119, 255, 0);
  }
}
.canvas-item-select-pop {
  animation: canvas-item-select-pop 300ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .canvas-item-enter {
    animation: none;
  }
  .canvas-item-select-pop {
    animation: none !important;
  }
}
</style>
