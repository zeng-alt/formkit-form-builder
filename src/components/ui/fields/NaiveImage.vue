<script setup lang="ts">
// ═══ K2：图片元素自适应 ═══════════════════════════════════════════════════════
// sizeMode 三选一，画布与运行时（FormRenderer）共用这一个组件，所见即所得：
// - ratio（默认）：宽度撑满所在列，高度按 aspectRatio 用 CSS aspect-ratio 决定；
//   original 表示不设 aspect-ratio，交给浏览器按图片自身比例撑开。
// - fill：宽高都撑满条目（配合 row-span 占用行数），并设 minHeight 兜底，避免同行
//   没有其它字段时行高塌成 0。
// - fixed：按设定像素宽高的比例等比缩放，宽度不超过所在列。
// sizeMode/aspectRatio/minHeight 是自定义配置键，NImage 并不认识，不能整体透传
// （会变成无意义的 DOM attribute），这里显式排除、按需读取 config 驱动外层容器样式。
import type { FormKitFrameworkContext } from '@formkit/core'
import { computed } from 'vue'
import { NImage } from 'naive-ui'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props, bind } = useSchemaAttrs(context, {
  // width/height 由本组件换算成容器尺寸（fixed 模式），不交给 NImage
  omit: ['sizeMode', 'aspectRatio', 'minHeight', 'width', 'height'],
})
const { runEvent } = useBindEvents(context, bind)

type SizeMode = 'ratio' | 'fill' | 'fixed'
const sizeMode = computed<SizeMode>(() => {
  const v = config.sizeMode
  return v === 'fill' || v === 'fixed' ? v : 'ratio'
})

type AspectRatio = '16/9' | '4/3' | '3/2' | '1/1' | 'original'
const ASPECT_RATIOS: AspectRatio[] = ['16/9', '4/3', '3/2', '1/1', 'original']
const aspectRatio = computed<AspectRatio>(() => {
  const v = config.aspectRatio
  return (ASPECT_RATIOS as string[]).includes(v as string) ? (v as AspectRatio) : '16/9'
})
// original：不设 aspect-ratio，占位框（无 src 时）仍按 16:9 兜底，与规格一致
const cssAspectRatio = computed(() =>
  aspectRatio.value === 'original' ? undefined : aspectRatio.value,
)

const minHeight = computed(() => {
  const raw = config.minHeight
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 120
})

const hasSrc = computed(() => typeof config.src === 'string' && config.src.trim() !== '')

// 固定尺寸：设定的像素宽高（缺省沿用旧默认 240×160）
const fixedWidth = computed(() => {
  const n = Number(config.width)
  return Number.isFinite(n) && n > 0 ? n : 240
})
const fixedHeight = computed(() => {
  const n = Number(config.height)
  return Number.isFinite(n) && n > 0 ? n : 160
})

// 三种模式互斥的容器样式：
// - ratio：宽度撑满所在列，高度由 aspect-ratio 决定
// - fill：容器撑满祖先传下来的高度（高度链见 src/style.css 的 .naive-image--fill 规则，
//   画布与运行时共用），图片绝对定位铺满容器，不参与行高计算——否则图片会按原图比例
//   反过来把整行撑高；minHeight 兜底同行没有其它字段时高度塌掉
// - fixed：按设定宽高的比例等比缩放，宽度不超过所在列（列比设定宽度窄时整体缩小，
//   而不是只压窄宽度把图片裁掉）
const wrapperStyle = computed(() => {
  if (sizeMode.value === 'fixed')
    return {
      width: '100%',
      maxWidth: `${fixedWidth.value}px`,
      aspectRatio: `${fixedWidth.value} / ${fixedHeight.value}`,
    }
  if (sizeMode.value === 'fill') return { width: '100%', minHeight: `${minHeight.value}px` }
  return {
    width: '100%',
    ...(cssAspectRatio.value ? { aspectRatio: cssAspectRatio.value } : {}),
  }
})
// 无 src 的占位框：ratio 模式下没有 aspect-ratio（original）时按 16:9 兜底
const placeholderStyle = computed(() => {
  if (sizeMode.value === 'ratio' && !cssAspectRatio.value) return { aspectRatio: '16/9' }
  return {}
})

async function handleClick(e: MouseEvent) {
  await runEvent('onClick', e)
  context?.handlers?.click?.(e)
}
</script>

<template>
  <div
    class="w-full py-2"
    :class="sizeMode === 'fill' ? 'naive-image--fill h-full flex flex-col' : ''"
    @click="handleClick"
  >
    <div
      class="naive-image-wrapper relative overflow-hidden rounded-md"
      :class="sizeMode === 'fill' ? 'flex-1' : ''"
      :style="wrapperStyle"
    >
      <NImage
        v-if="hasSrc"
        v-bind="props"
        class="naive-image-el naive-image-el--fluid"
        :class="sizeMode === 'fill' ? 'naive-image-el--overlay' : ''"
      />
      <div
        v-else
        class="naive-image-placeholder flex w-full flex-1 items-center justify-center rounded-md bg-neutral-100 text-muted-foreground dark:bg-neutral-800"
        :style="placeholderStyle"
      >
        <span aria-hidden="true" class="i-lucide-image h-8 w-8 opacity-60"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 三种模式下 NImage 渲染的 <img> 都完全填满外层容器（尺寸由容器决定，不再用 NImage
   自己的 width/height 数字 prop），objectFit 仍走 NImage 自身的 prop。 */
.naive-image-el--fluid,
.naive-image-el--fluid :deep(img) {
  width: 100%;
  height: 100%;
  display: block;
}
/* fill：图片绝对定位铺满容器，不贡献自身高度，行高由同行的其它字段决定 */
.naive-image-el--overlay {
  position: absolute;
  inset: 0;
}
</style>
