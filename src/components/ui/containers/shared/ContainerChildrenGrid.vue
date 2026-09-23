<script setup lang="ts">
import { computed, nextTick, ref, watch, type Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NEmpty } from 'naive-ui'
import { getColSpan, getRowSpan } from '@/utils/dnd/grid'
import { dropFlashState } from '@/utils/dnd/drop-flash'
import { toCanvasSchemaNode, getCanvasSchemaArray } from '@/utils/canvas-schema'
import { useSchemaRenderData } from '@/composables/use-schema-render-data'
import { useCanvasSchemaContext } from '@/builder/composables/canvas-schema-context'
import { useGridSpanResize } from '@/builder/composables/use-grid-span-resize'
import CanvasGridItem from './CanvasGridItem.vue'

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
const schemaLibrary = computed(() => canvasCtx?.library)
// 画布设计态：这里通常注入不到 FormRenderer 的 previewFormData（画布不在 FormRenderer
// 树下），退化为只有 helper——设计态本来就没有真实表单数据，行为与此前直接传
// EXPR_SCHEMA_HELPERS 一致，只是改用统一入口，不再是特例
const schemaRenderData = useSchemaRenderData()
// canvasCtx.renderNode 已经按源节点身份缓存，返回喂给 FormKitSchema 的单元素数组
//（见 use-canvas-schema.ts）；没有 canvasCtx 时（脱离画布上下文的场景）本地按同样
// 策略缓存 toCanvasSchemaNode 的结果，保证两条路径下 schema prop 都保持引用稳定。
// canvasCtx.renderNode 类型是 (node: unknown) => unknown[]（画布上下文里可插拔的钩子，
// 不锁定具体节点形态），最终要喂给 FormKitSchema 的 schema prop（FormKit 自己的大联合
// 类型），这里保留必要的收尾断言
// 缓存分桶键，必须是稳定引用
const computeFallbackSchemaNode = (n: unknown): unknown =>
  toCanvasSchemaNode(n as FormKitSchemaFormKit)
const renderSchema = (node: FormKitSchemaFormKit) => {
  if (canvasCtx?.renderNode) return canvasCtx.renderNode(node) as any
  return getCanvasSchemaArray(node, computeFallbackSchemaNode) as any
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

const {
  resizingIndex,
  pointerPosition,
  limitState,
  limitPulse,
  startResize,
  adjustSpanByKeyboard,
  resetSpanToFull,
  maxSpanForIndex,
} = useGridSpanResize({
  items: props.items,
  containerRef: props.containerRef,
  onResizeEnd: props.onResizeEnd,
  maxSpanFor: props.maxSpanFor,
})

// ═══ K1.2/K1.3：拖动期间的 12 列辅助格 + 吸附线 + 跟随鼠标的数值气泡 ═══════════════
// 辅助格/高亮/吸附线直接测量正在调宽的条目在 DOM 里的真实矩形（相对 ul 内容区），
// 而不是重新实现一遍网格自动布局算法——浏览器已经按 grid-column/grid-row（或输入组
// 的百分比宽度）把条目排好了，量它比算它准，两种布局（grid/row）也不用分别写一套。
// 每次 items 引用变化（拖动中每次移动都会替换 items.value）或 resizingIndex 变化后，
// 等 DOM 按新 span 更新完（nextTick）再量一次。
const resizeRect = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const measureResizeRect = () => {
  const idx = resizingIndex.value
  const ul = props.containerRef?.value as HTMLElement | null
  if (idx === null || !ul) {
    resizeRect.value = null
    return
  }
  const li = ul.children[idx] as HTMLElement | undefined
  if (!li) {
    resizeRect.value = null
    return
  }
  const ulRect = ul.getBoundingClientRect()
  const liRect = li.getBoundingClientRect()
  resizeRect.value = {
    top: liRect.top - ulRect.top,
    left: liRect.left - ulRect.left,
    width: liRect.width,
    height: liRect.height,
  }
}
watch(
  [resizingIndex, () => props.items.value],
  () => {
    nextTick(measureResizeRect)
  },
  { flush: 'post' },
)

// 气泡文案「N / 12 · 百分比」：分母固定 12（画布始终是 12 列栅格），即便输入组内
// 单项的实际上限比 12 小（maxSpanFor 钳制），气泡仍按整行 12 列换算百分比，
// 与用户在栅格辅助格里看到的比例一致
const resizeSpan = computed(() => {
  const idx = resizingIndex.value
  if (idx === null) return 0
  return getColSpan(props.items.value[idx])
})
const resizePercent = computed(() => Math.round((resizeSpan.value / 12) * 100))
const bubbleText = computed(() => `${resizeSpan.value} / 12 · ${resizePercent.value}%`)

// ── 手动 FLIP 动画：排序/重排（items 数量不变但顺序变化）时让元素平滑滑动到新位置。
// 不用 <TransitionGroup> 的 move 类（其 leave 动画会触发 DnD 库的 DOM 数量警告），
// 这里在 DOM 更新前后各测一次位置，对位移的元素施加反向 transform 再过渡回原位。
const FLIP_DURATION_MS = 200
const flipCssVar = '--canvas-item-flip'
let prevFlipRects: Map<string, DOMRect> | null = null
// 顺序 + 宽度（outerClass 里的 col/row-span）决定条目位置；两者都没变就不会有位移
const flipKey = (c: FormKitSchemaFormKit | undefined) =>
  `${c?.__key ?? c?.name ?? ''}|${c?.outerClass ?? ''}`

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
    // 只有"数量不变、顺序或宽度变了"才需要 FLIP；都没变（最常见的属性编辑）时直接跳过，
    // 否则每次编辑都要对全部条目 getBoundingClientRect，强制同步布局，随字段数线性增长
    if (next.length !== prev.length) return
    if (next.every((c, i) => flipKey(c) === flipKey(prev[i]))) return
    prevFlipRects = readChildRects()
    nextTick(() => {
      const prevRects = prevFlipRects
      prevFlipRects = null
      if (!prevRects) return
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

// itemStyle 拆成两组原语（字符串）props 而不是一个 style 对象：CanvasGridItem 是
// 独立组件，对象 prop 每次都是新引用会让 Vue 判定"变了"进而放弃 props 浅比较的
// 短路优化；宽度/跨度这些值本身是原语，未变时可以真正 === 相等。
// row 布局（输入组 / 按钮组）依赖同层全部兄弟项的总宽，grid 布局只依赖自身 outerClass。
const rowItemStyle = (child: FormKitSchemaFormKit): { width: string; flex: string } => {
  if (props.autoWidth) return { width: 'auto', flex: '0 0 auto' }
  // 纵向按钮组：column 下 flex-basis 控制的是高度，width:0% 会把宽度压扁，
  // 改为每个按钮占满整列宽度、不纵向拉伸
  if (props.equalWidth && props.vertical) return { width: '100%', flex: '0 0 auto' }
  // 按钮组：子按钮等分整行宽度（有多少个就平分多少）
  if (props.equalWidth) return { flex: '1 1 0%', width: '0%' }
  if (props.items.value.length === 1) return { width: '100%', flex: '0 0 auto' }
  // 输入组（row 布局）：按 col-span/12 显示宽度（4 → 33%、6 → 50%）。
  // 仅当历史数据总宽 > 12 时按比例缩放兜底，避免元素溢出容器、右侧按钮被裁掉
  const spans = props.items.value.map((c) => Math.max(2, Math.min(12, getColSpan(c))))
  const totalSpan = spans.reduce((a, b) => a + b, 0) || 1
  const span = Math.max(2, Math.min(12, getColSpan(child)))
  const pct = totalSpan > 12 ? (span / totalSpan) * 100 : (span / 12) * 100
  return { width: `${pct}%`, flex: '0 0 auto' }
}

const resizeHandleClass = computed(() => {
  // row 布局：右上角留给删除按钮，调节把手左移一格避免重叠
  if (layout.value === 'row') return 'absolute top-2 right-10 z-30'
  return 'absolute top-1/2 -translate-y-1/2 -right-3 z-30'
})

const itemKey = (child: FormKitSchemaFormKit, idx: number): string =>
  child?.__key || child?.name || `${child?.$formkit}-${idx}`
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
      <CanvasGridItem
        v-for="(child, idx) in props.items.value"
        :key="itemKey(child, idx)"
        :item-key="itemKey(child, idx)"
        :child="child"
        :index="idx"
        :selected="!!child?.__key && child.__key === props.selectedKey"
        :resizing="resizingIndex === idx"
        :dragging="isDragging"
        :drag-enabled="dragEnabled"
        :drag-handle="dragHandle"
        :layout="layout"
        :auto-width="props.autoWidth"
        :equal-width="props.equalWidth"
        :grid-column="
          layout === 'grid' ? `span ${getColSpan(child)} / span ${getColSpan(child)}` : undefined
        "
        :grid-row="
          layout === 'grid' ? `span ${getRowSpan(child)} / span ${getRowSpan(child)}` : undefined
        "
        :row-width="layout === 'row' ? rowItemStyle(child).width : undefined"
        :row-flex="layout === 'row' ? rowItemStyle(child).flex : undefined"
        :col-span="getColSpan(child)"
        :resize-handle-class="resizeHandleClass"
        :show-delete-tooltip="props.showDeleteTooltip"
        :delete-tooltip-text="props.deleteTooltipText"
        :delete-aria-label="props.deleteAriaLabel"
        :copy-aria-label="props.copyAriaLabel"
        :copy-tooltip-text="props.copyTooltipText"
        :resize-aria-label="props.resizeAriaLabel"
        :resize-max="maxSpanForIndex(idx)"
        :limit-hit="resizingIndex === idx ? limitState : null"
        :limit-pulse="resizingIndex === idx ? limitPulse : 0"
        :drop-flash="dropFlashState[itemKey(child, idx)] ?? 0"
        :has-copy="!!props.onCopy"
        :schema-library="schemaLibrary"
        :schema-render-data="schemaRenderData"
        :render-schema="renderSchema"
        :on-select="props.onSelect"
        :on-delete="props.onDelete"
        :on-copy="props.onCopy"
        :on-start-resize="startResize"
        :on-keyboard-resize="adjustSpanByKeyboard"
        :on-reset-span="resetSpanToFull"
      />
    </ul>

    <!-- K1.2/K1.3：拖动期间的 12 列辅助格 + 吸附线 + 跟随鼠标的数值气泡。
         pointer-events: none，不参与布局与 DnD；只在拖动期间显示。 -->
    <div
      v-if="resizingIndex !== null && resizeRect"
      class="absolute z-30 pointer-events-none"
      :style="{ top: `${resizeRect.top}px`, height: `${resizeRect.height}px`, left: 0, right: 0 }"
    >
      <div :class="['grid grid-cols-12 gap-x-4 h-full', layout === 'grid' ? 'px-2' : '']">
        <span
          v-for="n in 12"
          :key="n"
          class="rounded-md bg-[#a277ff]/[0.05] outline outline-1 outline-dashed outline-[#a277ff]/25"
        ></span>
      </div>
      <div
        class="absolute inset-y-0 rounded-md"
        :class="limitState ? 'bg-red-500/[0.16]' : 'bg-[#a277ff]/[0.14]'"
        :style="{ left: `${resizeRect.left}px`, width: `${resizeRect.width}px` }"
      >
        <span
          class="absolute inset-y-0 right-0 w-[2px] rounded-full"
          :class="limitState ? 'bg-red-500' : 'bg-[#a277ff]'"
        ></span>
      </div>
    </div>

    <div
      v-if="resizingIndex !== null && pointerPosition"
      class="fixed z-[999] pointer-events-none select-none"
      :style="{ left: `${pointerPosition.x + 14}px`, top: `${pointerPosition.y - 36}px` }"
    >
      <span
        :key="`resize-bubble-shake-${limitPulse}`"
        :class="[
          'inline-block rounded-lg px-2.5 py-1 text-xs font-medium tracking-wide text-white shadow-lg whitespace-nowrap',
          limitState ? 'bg-red-500 resize-bubble-shake' : 'bg-[#a277ff]',
        ]"
      >
        <span :key="`resize-bubble-pop-${resizeSpan}`" class="inline-block resize-bubble-pop">{{
          bubbleText
        }}</span>
      </span>
    </div>

    <div v-if="props.items.value.length === 0" :class="emptyPlaceholderClass">
      <slot name="empty">
        <div class="w-full h-full flex items-center justify-center">
          <n-empty :description="props.emptyText" />
        </div>
      </slot>
    </div>
  </div>
</template>

<!-- 画布条目进入动画 / 选中提示的 keyframes 已随 <li> 一起迁到 CanvasGridItem.vue
     （scoped 样式绑定在拥有对应 class 的组件上，这里不再重复定义）。 -->

<style scoped>
/* K1.3：气泡列数变化时的轻微缩放弹跳。用 span 的值当 key（见模板）强制重新挂载，
   每次列数变化正好重播一次；:key 不变时 Vue 不会重新创建节点，动画也就不会重放。 */
@keyframes resize-bubble-pop {
  0% {
    transform: scale(0.85);
  }
  60% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}
.resize-bubble-pop {
  animation: resize-bubble-pop 120ms ease-out;
}
/* 撞限抖动：与 CanvasGridItem.vue 的胶囊抖动同一套 keyframes 命名习惯，
   同样只在 limitPulse 变化（重新挂载）时播放一次 */
@keyframes resize-bubble-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-2px);
  }
  40% {
    transform: translateX(2px);
  }
  60% {
    transform: translateX(-1px);
  }
  80% {
    transform: translateX(1px);
  }
}
.resize-bubble-shake {
  animation: resize-bubble-shake 220ms ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .resize-bubble-pop,
  .resize-bubble-shake {
    animation: none;
  }
}
</style>
