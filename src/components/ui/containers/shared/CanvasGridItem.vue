<script setup lang="ts">
// ═══ 画布单个条目 ═══════════════════════════════════════════════════════════════
// 从 ContainerChildrenGrid.vue 的 <li v-for> 拆出的独立组件。这里的 li 是画布上
// 未改动字段占多数的高频渲染单元：拆成组件后，Vue 按 props 做浅比较，只要传入的
// 每个 prop（尤其是 schema 数组 / schemaLibrary / schemaRenderData）引用不变，
// 整个条目（含内部 FormKitSchema）就会跳过重渲染，不需要在这里手写 v-memo 的
// 依赖列表——那份列表要跟随模板逐行核对，漏一项就是陈旧 UI bug，而组件边界的
// props 浅比较由 Vue 保证，风险小得多（见规格 B5 的选型说明）。
import { computed, ref, type Component } from 'vue'
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
  /** 本项调宽的上限（aria-valuemax）：普通字段 12，输入组内按 maxSpanFor 逐项计算 */
  resizeMax?: number
  /** 本项是否正撞在上/下限（拖动或键盘调整时）：驱动把手/气泡的警示色 */
  limitHit?: 'min' | 'max' | null
  /** 撞限一次性抖动的触发计数：变化即重放一次抖动动画，见 use-grid-span-resize.ts */
  limitPulse?: number
  hasCopy: boolean
  /** L6：放下后的高亮闪烁计数——变化即重放一次，与 selected 状态无关（移动一个
   *  未选中、或选中态本身没变化的已选中元素，都要能重新触发这次反馈） */
  dropFlash?: number
  schemaLibrary?: Record<string, Component>
  schemaRenderData: Record<string, unknown>
  renderSchema: (node: FormKitSchemaFormKit) => unknown[]
  onSelect: (child: FormKitSchemaFormKit, index: number) => void
  onDelete: (index: number) => void
  onCopy?: (index: number) => void
  onStartResize: (e: PointerEvent, index: number) => void
  /** 键盘调宽：焦点在把手上时 ← / → 各 -1 / +1 列 */
  onKeyboardResize?: (index: number, delta: number) => void
  /** 双击把手：恢复整行（或输入组 maxSpanFor 允许的最大值） */
  onResetSpan?: (index: number) => void
}>()

// 步骤向导节点不提供复制按钮（全局唯一，复制无意义）
const isStepsItem = (child: SchemaNode): boolean =>
  child?.$cmp === 'steps' || child?.$formkit === 'steps'

const ruleCount = computed(() => validationCount(props.child))

// ═══ K2：图片 fill 模式撑满所占行 ═══════════════════════════════════════════════
// li 本身作为 grid 项，默认 align-self:stretch 已经拿到了整段 row-span 的真实高度
// （CSS Grid 的这条对齐规则会给它一个"确定的"used height，供后代 height:100% 逐层
// 解析），但要让这个高度一路传到 NaiveImage.vue 自己的容器，中间经过的每一层
// （这里两个包装 div + FormKit 生成的 outer/wrapper/inner）都必须显式声明
// height:100%/flex:1——只要有一层还是默认的 height:auto，链条就断在那一层。
// 只在图片是 fill 模式时才切这条链路（下面 scoped 样式用 .canvas-item--fill-image
// 限定），不影响其余字段类型或 ratio/fixed 两种模式（它们本就不依赖行高）。
const isFillImage = computed(() => {
  const child = props.child as SchemaNode
  const isImage = child?.$formkit === 'naiveImage' || child?.$cmp === 'naiveImage'
  return isImage && (child?.props as { sizeMode?: string } | undefined)?.sizeMode === 'fill'
})

const itemStyle = () => {
  if (props.layout === 'row') return { width: props.rowWidth, flex: props.rowFlex }
  return { gridColumn: props.gridColumn, gridRow: props.gridRow }
}

// ═══ 点字段标签选中后按 delete 能删除 ═══════════════════════════════════════════
// 画布里的字段控件保持可交互（能输入、下拉、切换标签页等）。点 FormKit 字段标签时，
// 浏览器的默认行为是把焦点/点击转交给 for 关联的控件（文本框获得焦点、复选框被切换），
// 焦点落进文本框后 Backspace（Mac 的 delete 键）就只会删字、删不掉元素。这里只拦截
// "字段标签"这一处的默认转交：焦点留在条目自己身上（tabindex="0"），快捷键处理器据此
// 响应 Backspace/Delete；直接点控件本身照常交互。
// 嵌套容器（card 里的字段）时 click 从内到外冒泡到每一层 <li data-canvas-item>，只有
// 标签离得最近的那个条目（closest 命中自己）才处理。
const liRef = ref<HTMLLIElement | null>(null)
function onLabelClick(e: MouseEvent) {
  const target = e.target
  const li = liRef.value
  if (!li || !(target instanceof HTMLElement)) return
  const label = target.closest('.formkit-label')
  if (!label || label.closest('[data-canvas-item]') !== li) return
  if (label.closest('[data-canvas-edit]')) return
  e.preventDefault()
  li.focus({ preventScroll: true })
}
</script>

<template>
  <li
    ref="liRef"
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
      isFillImage ? 'canvas-item--fill-image' : '',
    ]"
    :style="itemStyle()"
    tabindex="0"
    @pointerdown.stop="props.onSelect(child, index)"
    @keydown.enter.stop.prevent="props.onSelect(child, index)"
    @keydown.space.stop.prevent="props.onSelect(child, index)"
    @click="onLabelClick"
  >
    <!-- L6：放下后的高亮闪烁——纯装饰覆盖层，独立于 selected 状态之外重放一次
         canvas-item-select-pop 动画；:key 用计数强制重新挂载，复用 pop 放在 li
         自身会和"选中态常驻这个 class"互相打架，这里用一个覆盖层规避 -->
    <span
      v-if="dropFlash"
      :key="`drop-flash-${dropFlash}`"
      aria-hidden="true"
      class="absolute inset-0 z-30 rounded-xl pointer-events-none canvas-item-select-pop"
    ></span>
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
    <div :class="['flex gap-1.5 p-1 w-full pb-2', isFillImage ? 'flex-col h-full' : '']">
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
      class="absolute -top-[23px] left-0 z-30 flex h-[22px] max-w-[220px] items-center rounded-[7px] border border-border/70 bg-card px-2 shadow-[0_1px_4px_rgba(0,0,0,0.12)] transition-[opacity] duration-150 dark:border-border/50 dark:bg-neutral-900"
      :class="[
        'opacity-0 pointer-events-none',
        'group-hover:opacity-100',
        selected ? '!opacity-100' : '',
      ]"
    >
      <span class="truncate text-[11px] text-muted-foreground">
        {{ child?.name || child?.$formkit || child?.$cmp }}
      </span>
      <!-- 校验规则数放在浮于边框外的名称标签里：原先压在条目右下角，左侧标签布局或
           多行输入时会盖住输入框；0 条规则时不显示 -->
      <span v-if="ruleCount > 0" class="ml-1.5 shrink-0 text-[11px] text-[#a277ff]">
        · {{ ruleCount }} {{ pluralize(ruleCount, 'rule') }}
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

    <!-- 调宽把手（方案 B 胶囊）：可点击区域比可见胶囊左右各宽 4px（resize-pill-hit
         的内边距），光标 ew-resize；可聚焦，← / → 键盘调宽，双击恢复整行。悬停条目时
         淡入，悬停/聚焦到胶囊本身时变主题紫、竖纹变白、阴影加深（见下方 scoped 样式）。
         不再用 n-button + ⋮ 图标，也不再在条目中央盖数字 overlay（改为跟随鼠标的气泡，
         由 ContainerChildrenGrid 统一渲染，见该文件）。 -->
    <div
      v-if="!autoWidth && !equalWidth"
      role="slider"
      tabindex="0"
      :aria-valuemin="2"
      :aria-valuemax="resizeMax ?? 12"
      :aria-valuenow="colSpan"
      :aria-label="resizeAriaLabel ?? 'Resize'"
      :class="[
        resizeHandleClass,
        'resize-pill-hit group flex items-center justify-center !w-[22px] !h-[30px] !cursor-ew-resize',
        'opacity-0 pointer-events-none',
        'group-hover:opacity-100 group-hover:pointer-events-auto',
        'focus-visible:opacity-100 focus-visible:pointer-events-auto focus-visible:outline-none',
        'transition-opacity duration-150',
        resizing ? '!opacity-100' : dragging ? '!opacity-0 !pointer-events-none' : '',
      ]"
      @pointerdown.stop.prevent="onStartResize($event, index)"
      @keydown.left.stop.prevent="onKeyboardResize?.(index, -1)"
      @keydown.right.stop.prevent="onKeyboardResize?.(index, 1)"
      @dblclick.stop.prevent="onResetSpan?.(index)"
    >
      <!-- 抖动只加在这个纯装饰的内层 span 上、用 limitPulse 当 key 强制重挂载重播一次：
           外层承载焦点/role/tabindex，remount 会丢焦点，绝不能被这个 key 影响到 -->
      <span
        :key="`resize-pill-${limitPulse ?? 0}`"
        :class="[
          'flex items-center justify-center gap-0.5 w-3.5 h-[30px] rounded-[7px] border',
          'bg-white border-black/10 shadow-[0_1px_4px_rgba(0,0,0,0.12)]',
          'dark:bg-neutral-900 dark:border-white/10',
          'transition-[background-color,border-color,box-shadow] duration-150',
          'group-hover:!bg-[#a277ff] group-hover:!border-[#a277ff] group-hover:shadow-[0_4px_12px_rgba(162,119,255,0.35)]',
          'group-focus-visible:!bg-[#a277ff] group-focus-visible:!border-[#a277ff] group-focus-visible:shadow-[0_4px_12px_rgba(162,119,255,0.35)]',
          resizing
            ? '!bg-[#a277ff] !border-[#a277ff] shadow-[0_4px_12px_rgba(162,119,255,0.35)]'
            : '',
          limitHit
            ? '!bg-red-500 !border-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.35)] resize-pill-shake'
            : '',
        ]"
      >
        <i
          :class="[
            'block w-0.5 h-2.5 rounded-full bg-black/35 dark:bg-white/40 transition-colors duration-150',
            'group-hover:!bg-white group-focus-visible:!bg-white',
            resizing || limitHit ? '!bg-white' : '',
          ]"
        ></i>
        <i
          :class="[
            'block w-0.5 h-2.5 rounded-full bg-black/35 dark:bg-white/40 transition-colors duration-150',
            'group-hover:!bg-white group-focus-visible:!bg-white',
            resizing || limitHit ? '!bg-white' : '',
          ]"
        ></i>
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

/* ═══ K1：调宽把手（方案 B 胶囊）═══════════════════════════════════════════════
   外观本身走 UnoCSS 工具类（见上方模板，与文件里其它按钮的写法一致），这里只放
   CSS 动画做不到用工具类表达的部分：撞限抖动。每次撞限只播放一次——调用方
   （ContainerChildrenGrid）把 limitPulse 计数当 key 扣在纯装饰的内层 span 上，
   计数变化才会重新挂载、重放这个动画；持续停在同一个限位上不会连续抖。 */
@keyframes resize-pill-shake {
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
.resize-pill-shake {
  animation: resize-pill-shake 220ms ease-in-out;
}

/* K2：图片 fill 模式撑满所占行——画布条目自身这一段：li 的高度（CSS Grid 的 stretch
   对齐给出）经内容包装层（上方 isFillImage 时的 flex-col h-full）传到 FormKitSchema
   渲染出的 .formkit-outer；从 .formkit-outer 往里的高度链是画布与运行时共用的全局规则，
   见 src/style.css 的 .naive-image--fill。 */
.canvas-item--fill-image :deep(.formkit-outer) {
  height: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .canvas-item-enter {
    animation: none;
  }
  .canvas-item-select-pop {
    animation: none !important;
  }
  .resize-pill-shake {
    animation: none;
  }
}
</style>
