<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NButton, NTooltip } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'
import { useFormBuilderI18n } from '@/i18n/context'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { t } = useFormBuilderI18n()
const { config, bind, disabled } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)

// 只读语义同 richText：级联禁用 或 自身只读配置，都不可再落笔
const notEditable = computed<boolean>(() => disabled.value || Boolean(config.readonly))

const height = computed<number>(() => {
  const raw = config.height as unknown
  const n = typeof raw === 'string' ? Number(raw) : raw
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 180
})
const strokeColor = computed<string>(() =>
  typeof config.strokeColor === 'string' && config.strokeColor ? config.strokeColor : '#111111',
)
const strokeWidth = computed<number>(() => {
  const raw = config.strokeWidth as unknown
  const n = typeof raw === 'string' ? Number(raw) : raw
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 2
})

// 笔迹存 0~1 的归一化坐标（相对画布当前显示宽高），容器宽度变化时按新尺寸换算像素坐标
// 重绘，不会因为窗口缩放而错位或被裁掉。
type NormPoint = { x: number; y: number }
type Stroke = { color: string; width: number; points: NormPoint[] }

const wrapperEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const strokes = ref<Stroke[]>([])
const backgroundImage = ref<HTMLImageElement | null>(null)
const isDrawing = ref(false)
let currentStroke: Stroke | null = null
let resizeObserver: ResizeObserver | null = null

const isEmpty = computed(() => strokes.value.length === 0 && !backgroundImage.value)

function getCtx(): CanvasRenderingContext2D | null {
  return canvasEl.value?.getContext('2d') ?? null
}

function displaySize(): { width: number; height: number } {
  const w = wrapperEl.value?.clientWidth || canvasEl.value?.clientWidth || 300
  return { width: w, height: height.value }
}

/** 按 devicePixelRatio 调整画布的后备存储尺寸，绘图坐标仍用 CSS 像素（ctx.scale 抵消） */
function resizeCanvasBackingStore() {
  const canvas = canvasEl.value
  if (!canvas) return
  const { width, height: h } = displaySize()
  const dpr = window.devicePixelRatio || 1
  canvas.style.width = `${width}px`
  canvas.style.height = `${h}px`
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(h * dpr))
  const ctx = getCtx()
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function redrawAll() {
  const ctx = getCtx()
  const canvas = canvasEl.value
  if (!ctx || !canvas) return
  const { width, height: h } = displaySize()
  // 画布背景固定浅色：暗色主题下也用深色笔迹 + 浅色背景，保证导出的 PNG 单独查看时可读
  ctx.clearRect(0, 0, width, h)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, h)
  if (backgroundImage.value) ctx.drawImage(backgroundImage.value, 0, 0, width, h)
  for (const stroke of strokes.value) drawStroke(ctx, stroke, width, h)
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, width: number, h: number) {
  if (stroke.points.length === 0) return
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const first = stroke.points[0]!
  ctx.moveTo(first.x * width, first.y * h)
  if (stroke.points.length === 1) {
    // 单点（点击未拖动）：画一个小圆点，避免完全看不见
    ctx.lineTo(first.x * width + 0.01, first.y * h)
  }
  for (const p of stroke.points.slice(1)) ctx.lineTo(p.x * width, p.y * h)
  ctx.stroke()
}

function toNormPoint(e: PointerEvent): NormPoint {
  const { width, height: h } = displaySize()
  const rect = canvasEl.value!.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / (width || rect.width || 1))),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / (h || rect.height || 1))),
  }
}

function exportValue(): string {
  if (isEmpty.value) return ''
  return canvasEl.value?.toDataURL('image/png') ?? ''
}

async function commitValue() {
  const next = exportValue()
  const current = typeof context._value === 'string' ? context._value : ''
  if (next === current) return
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}

function handlePointerDown(e: PointerEvent) {
  if (notEditable.value) return
  isDrawing.value = true
  currentStroke = { color: strokeColor.value, width: strokeWidth.value, points: [toNormPoint(e)] }
  canvasEl.value?.setPointerCapture(e.pointerId)
  redrawAll()
}

function handlePointerMove(e: PointerEvent) {
  if (!isDrawing.value || !currentStroke) return
  currentStroke.points.push(toNormPoint(e))
  redrawAll()
  const ctx = getCtx()
  const { width, height: h } = displaySize()
  if (ctx) drawStroke(ctx, currentStroke, width, h)
}

function handlePointerLeave(e: PointerEvent) {
  if (isDrawing.value) endStroke(e)
}

function endStroke(e: PointerEvent) {
  if (!isDrawing.value || !currentStroke) return
  isDrawing.value = false
  if (currentStroke.points.length > 0) strokes.value.push(currentStroke)
  currentStroke = null
  try {
    canvasEl.value?.releasePointerCapture(e.pointerId)
  } catch {
    // 指针已释放/元素已卸载时忽略
  }
  redrawAll()
  void commitValue()
}

function undoStroke() {
  if (notEditable.value) return
  if (strokes.value.length > 0) strokes.value = strokes.value.slice(0, -1)
  else if (backgroundImage.value) backgroundImage.value = null
  redrawAll()
  void commitValue()
}

function clearAll() {
  if (notEditable.value) return
  strokes.value = []
  backgroundImage.value = null
  redrawAll()
  void commitValue()
}

/** 外部值变化（如切换选中元素、撤销/重做整个表单）且非用户当前正在画：按 dataURL 重新加载底图 */
function loadFromValue(raw: unknown) {
  const src = typeof raw === 'string' ? raw : ''
  if (!src) {
    backgroundImage.value = null
    strokes.value = []
    redrawAll()
    return
  }
  const img = new Image()
  img.onload = () => {
    backgroundImage.value = img
    strokes.value = []
    redrawAll()
  }
  img.src = src
}

onMounted(() => {
  resizeCanvasBackingStore()
  loadFromValue(context._value)
  if (typeof ResizeObserver !== 'undefined' && wrapperEl.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeCanvasBackingStore()
      redrawAll()
    })
    resizeObserver.observe(wrapperEl.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// 只有当值被外部改写成与当前导出不同的内容时才重新加载（避免自己 commitValue 后的回环）
watch(
  () => context._value as unknown,
  (next) => {
    const current = exportValue()
    if ((typeof next === 'string' ? next : '') === current) return
    loadFromValue(next)
  },
)
</script>

<template>
  <div class="signature-field w-full">
    <div ref="wrapperEl" class="relative w-full" :style="{ height: `${height}px` }">
      <canvas
        ref="canvasEl"
        class="box-border block w-full rounded-md border border-solid border-input"
        :class="notEditable ? 'cursor-not-allowed' : 'cursor-crosshair touch-none'"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="endStroke"
        @pointercancel="endStroke"
        @pointerleave="handlePointerLeave"
      ></canvas>
      <div
        v-if="isEmpty"
        class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400"
      >
        {{ t('edits.signature.emptyHint') }}
      </div>
      <div v-if="!notEditable" class="absolute right-1.5 top-1.5 flex gap-1">
        <n-tooltip
          ><template #trigger
            ><n-button
              quaternary
              size="tiny"
              :disabled="isEmpty"
              @mousedown.prevent
              @click="undoStroke"
              ><template #icon
                ><span class="i-lucide-undo-2 h-3.5 w-3.5"></span></template></n-button></template
          >{{ t('edits.signature.undoLabel') }}</n-tooltip
        >
        <n-tooltip
          ><template #trigger
            ><n-button
              quaternary
              size="tiny"
              :disabled="isEmpty"
              @mousedown.prevent
              @click="clearAll"
              ><template #icon
                ><span class="i-lucide-trash-2 h-3.5 w-3.5"></span></template></n-button></template
          >{{ t('edits.signature.clearLabel') }}</n-tooltip
        >
      </div>
    </div>
  </div>
</template>
