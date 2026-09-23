<script setup lang="ts">
// ═══ 画布单个条目 ═══════════════════════════════════════════════════════════════
// 从 ContainerChildrenGrid.vue 的 <li v-for> 拆出的独立组件。这里的 li 是画布上
// 未改动字段占多数的高频渲染单元：拆成组件后，Vue 按 props 做浅比较，只要传入的
// 每个 prop（尤其是 schema 数组 / schemaLibrary / schemaRenderData）引用不变，
// 整个条目（含内部 FormKitSchema）就会跳过重渲染，不需要在这里手写 v-memo 的
// 依赖列表——那份列表要跟随模板逐行核对，漏一项就是陈旧 UI bug，而组件边界的
// props 浅比较由 Vue 保证，风险小得多（见规格 B5 的选型说明）。
import type { Component } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { FormKitSchema } from '@formkit/vue'
import { NButton, NTooltip } from 'naive-ui'
import { pluralize, validationCount } from '@/utils/text'
import type { SchemaNode } from '@/utils/schema/types'

const props = defineProps<{
  child: FormKitSchemaFormKit
  index: number
  itemKey: string
  selected: boolean
  resizing: boolean
  dragging: boolean
  dragEnabled: boolean
  dragHandle: boolean
  layout: 'grid' | 'row'
  autoWidth?: boolean
  equalWidth?: boolean
  /** grid 布局：本项的 gridColumn/gridRow（纯依赖自身 outerClass，无需依赖兄弟项） */
  gridColumn?: string
  gridRow?: string
  /** 当前 col-span 数值：调整宽度时中央提示徽标显示用 */
  colSpan?: number
  /** row 布局：本项的 width/flex（可能依赖同层兄弟项的总宽，父级算好传下来） */
  rowWidth?: string
  rowFlex?: string
  resizeHandleClass: string
  showDeleteTooltip?: boolean
  deleteTooltipText?: string
  deleteAriaLabel: string
  copyAriaLabel?: string
  copyTooltipText?: string
  resizeAriaLabel?: string
  hasCopy: boolean
  schemaLibrary?: Record<string, Component>
  schemaRenderData: Record<string, unknown>
  renderSchema: (node: FormKitSchemaFormKit) => unknown[]
  onSelect: (child: FormKitSchemaFormKit, index: number) => void
  onDelete: (index: number) => void
  onCopy?: (index: number) => void
  onStartResize: (e: PointerEvent, index: number) => void
}>()

// 步骤向导节点不提供复制按钮（全局唯一，复制无意义）
const isStepsItem = (child: SchemaNode): boolean =>
  child?.$cmp === 'steps' || child?.$formkit === 'steps'

const itemStyle = () => {
  if (props.layout === 'row') return { width: props.rowWidth, flex: props.rowFlex }
  return { gridColumn: props.gridColumn, gridRow: props.gridRow }
}
</script>

<template>
  <li
    :data-item-key="itemKey"
    data-canvas-item="true"
    :class="[
      'canvas-item-enter',
      'group rounded-xl transition-[border-color,background-color,box-shadow] duration-150',
      'px-2 py-1 pr-4 h-full !z-20 relative border-[1.5px] min-w-0 box-border',
      dragEnabled ? (dragHandle ? '!cursor-default' : '!cursor-grab') : '!cursor-default',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a277ff] focus-visible:ring-offset-2',
      selected
        ? 'border-solid border-[#a277ff] bg-[#a277ff]/[0.05] shadow-[0_0_0_3px_rgba(79,110,247,0.12)] dark:bg-[#a277ff]/[0.08] canvas-item-select-pop'
        : 'border-dashed border-transparent hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]',
    ]"
    :style="itemStyle()"
    tabindex="0"
    @pointerdown.stop="props.onSelect(child, index)"
    @keydown.enter.stop.prevent="props.onSelect(child, index)"
    @keydown.space.stop.prevent="props.onSelect(child, index)"
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
          :schema="renderSchema(child) as unknown as FormKitSchemaFormKit[]"
          :library="schemaLibrary"
          :data="schemaRenderData"
          :key="`container-child-${index}`"
        />
      </div>
    </div>

    <!-- 左上角显示元素名称（左对齐，浮在顶边框上方）：悬停（虚线框）或选中（实线框）时显示 -->
    <div
      class="absolute -top-[23px] left-0 z-30 flex h-[22px] max-w-[160px] items-center rounded-[7px] border border-border/70 bg-card px-2 shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-[opacity] duration-150 dark:border-border/50 dark:bg-neutral-900"
      :class="[
        'opacity-0 pointer-events-none',
        'group-hover:opacity-100',
        selected ? '!opacity-100' : '',
      ]"
    >
      <span class="truncate text-[11px] text-muted-foreground">
        {{ child?.name || child?.$formkit || child?.$cmp }}
      </span>
    </div>

    <!-- 悬停延伸区：覆盖复制/删除按钮及其左 8px、连接元素顶边，保证鼠标移向按钮时虚线框不消失 -->
    <span aria-hidden="true" class="absolute -top-[23px] right-0 z-30 h-[23px] w-[52px]"></span>

    <!-- 复制按钮：删除按钮左侧，浮在顶边框上方 -->
    <n-tooltip v-if="hasCopy && showDeleteTooltip && !isStepsItem(child)" placement="top">
      <template #trigger>
        <n-button
          quaternary
          size="small"
          :aria-label="copyAriaLabel"
          draggable="false"
          @pointerdown.stop.prevent
          @click.stop="onCopy?.(index)"
          :class="[
            'absolute -top-[23px] right-[22px] z-40 !h-[22px] !w-[22px] !rounded-[7px] !border !border-border/70 !shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:!bg-[#7c9ef8]/25 hover:!text-[#4f6ef7] active:!scale-95 active:!bg-[#7c9ef8]/35 active:!text-[#4f6ef7] dark:!border-border/50 dark:hover:!bg-[#7c9ef8]/30 transition-[transform,background-color,color,opacity] duration-150',
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            selected
              ? '!bg-[#a277ff]/15 !text-[#a277ff] !opacity-100 !pointer-events-auto'
              : '!bg-[#7c9ef8]/10 !text-[#4f6ef7]',
          ]"
        >
          <template #icon
            ><span aria-hidden="true" class="i-lucide-copy !h-[12px] !w-[12px]"></span
          ></template>
        </n-button>
      </template>
      {{ copyTooltipText }}
    </n-tooltip>

    <n-button
      v-if="hasCopy && !showDeleteTooltip && !isStepsItem(child)"
      quaternary
      size="small"
      :aria-label="copyAriaLabel"
      draggable="false"
      @pointerdown.stop.prevent
      @click.stop="onCopy?.(index)"
      :class="[
        'absolute -top-[23px] right-[22px] z-40 !h-[22px] !w-[22px] !rounded-[7px] !border !border-border/70 !shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:!bg-[#7c9ef8]/25 hover:!text-[#4f6ef7] active:!scale-95 active:!bg-[#7c9ef8]/35 active:!text-[#4f6ef7] dark:!border-border/50 dark:hover:!bg-[#7c9ef8]/30 transition-[transform,background-color,color,opacity] duration-150',
        'opacity-0 pointer-events-none',
        'group-hover:opacity-100 group-hover:pointer-events-auto',
        selected
          ? '!bg-[#a277ff]/15 !text-[#a277ff] !opacity-100 !pointer-events-auto'
          : '!bg-[#7c9ef8]/10 !text-[#4f6ef7]',
      ]"
    >
      <template #icon
        ><span aria-hidden="true" class="i-lucide-copy !h-[12px] !w-[12px]"></span
      ></template>
    </n-button>

    <!-- 删除按钮浮在右上角边框外侧（与边框留间距，不相连）：悬停（虚线框）或选中（实线框）时显示 -->
    <n-tooltip v-if="showDeleteTooltip" placement="top">
      <template #trigger>
        <n-button
          quaternary
          size="small"
          :aria-label="deleteAriaLabel"
          draggable="false"
          @pointerdown.stop.prevent
          @click.stop="onDelete(index)"
          :class="[
            'absolute -top-[23px] right-0 z-40 !h-[22px] !w-[22px] !rounded-[7px] !border !border-border/70 !shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:!bg-red-100 hover:!text-red-600 active:!scale-95 active:!bg-red-200 active:!text-red-700 dark:!border-border/50 dark:hover:!bg-red-950/50 dark:hover:!text-red-400 transition-[transform,background-color,color,opacity] duration-150',
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            selected
              ? '!bg-[#a277ff]/15 !text-[#a277ff] !opacity-100 !pointer-events-auto'
              : '!bg-[#7c9ef8]/10 !text-[#4f6ef7]',
          ]"
        >
          <template #icon
            ><span aria-hidden="true" class="i-lucide-trash-2 !h-[12px] !w-[12px]"></span
          ></template>
        </n-button>
      </template>
      {{ deleteTooltipText }}
    </n-tooltip>

    <n-button
      v-else
      quaternary
      size="small"
      :aria-label="deleteAriaLabel"
      draggable="false"
      @pointerdown.stop.prevent
      @click.stop="onDelete(index)"
      :class="[
        'absolute -top-[23px] right-0 z-40 !h-[22px] !w-[22px] !rounded-[7px] !border !border-border/70 !shadow-[0_1px_4px_rgba(0,0,0,0.12)] hover:!bg-red-100 hover:!text-red-600 active:!scale-95 active:!bg-red-200 active:!text-red-700 dark:!border-border/50 dark:hover:!bg-red-950/50 dark:hover:!text-red-400 transition-[transform,background-color,color,opacity] duration-150',
        'opacity-0 pointer-events-none',
        'group-hover:opacity-100 group-hover:pointer-events-auto',
        selected
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
        v-if="selected"
        class="px-2 mr-1 border-1 border-ring/40 dark:border-ring/20 rounded-md flex items-center justify-center"
      >
        <span class="text-xs">
          {{ validationCount(child) }} {{ pluralize(validationCount(child), 'rule') }}
        </span>
      </div>
    </div>

    <n-button
      v-if="!autoWidth && !equalWidth"
      text
      size="small"
      :aria-label="resizeAriaLabel ?? 'Resize'"
      :class="[
        resizeHandleClass,
        'opacity-0 pointer-events-none',
        'group-hover:opacity-100 group-hover:pointer-events-auto',
        'transition-[transform,opacity] duration-150',
        '!cursor-ew-resize',
        resizing ? '!opacity-100 scale-110' : dragging ? '!opacity-0 !pointer-events-none' : '',
      ]"
      content-class="!cursor-ew-resize"
      @pointerdown.stop.prevent="onStartResize($event, index)"
    >
      <template #icon>
        <span aria-hidden="true" class="i-lucide-more-vertical h-5 w-5"></span>
      </template>
    </n-button>

    <div
      v-if="resizing"
      class="absolute inset-0 z-40 bg-[#a277ff]/[0.06] flex items-center justify-center rounded-xl border-[1.5px] border-[#a277ff]/50"
    >
      <span
        class="bg-[#a277ff] text-white text-xs font-medium px-2.5 py-1 rounded-lg tracking-wide"
      >
        {{ colSpan }}
      </span>
    </div>
  </li>
</template>

<style scoped>
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
