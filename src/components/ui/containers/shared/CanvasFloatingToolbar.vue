<script setup lang="ts">
// ═══ D3/I3：浮动工具条 ══════════════════════════════════════════════════════════
// 单选一个元素时，浮在其右上角外侧的紧凑工具条：上移 / 下移 / 复制一份 /
// 包进容器（下拉） / 转换为（下拉） / 删除。所有操作都调用 D0 命令层，
// 跟右键菜单 / 快捷键完全共用同一份实现。
// I3：选中元素贴着画布可视顶边时，外侧位置会被画布滚动容器裁掉，或被顶栏（sticky）
// 盖住——改贴到元素内部右上角（见下方 measure() 与 positionClass）。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { NButton, NDropdown, NTooltip, type DropdownOption } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useCanvasCommands } from '@/builder/composables/use-canvas-commands'
import { findNodeByKey } from '@/utils/schema/tree'
import { getElementTypeBySchema } from '@/elements'
import type { SchemaNode } from '@/utils/schema/types'

const props = defineProps<{
  itemKey: string
}>()

// I3（追加）：把自己的渲染宽度 + 当前是否贴内侧汇报给 CanvasGridItem.vue，供它判断
// 选中元素左上角的名称标签会不会被这条工具条压住（见下方 measure() 末尾）。
const emit = defineEmits<{
  (e: 'layout', payload: { width: number; pinnedInside: boolean }): void
}>()

const { t } = useFormBuilderI18n()
const state = useFormBuilderState()
const commands = useCanvasCommands(state)

// 步骤向导全局唯一，不提供复制（命令层也兜底跳过，这里只是让按钮直接置灰）
const isSteps = computed(
  () =>
    getElementTypeBySchema(
      findNodeByKey(state.formSchema.value as unknown as SchemaNode[], props.itemKey)?.node,
    ) === 'steps',
)
const canMoveUp = computed(() => commands.canMoveUp(props.itemKey))
const canMoveDown = computed(() => commands.canMoveDown(props.itemKey))
const canWrap = computed(() => commands.canWrap([props.itemKey]))
// 转换为的候选项用元素「类型名」（如「文本域」），不用 .label（那是新建该类型
// 元素时的示例标签文案，如 textarea 的「客户地址」，放进这个菜单会很误导）
const convertOptions = computed<DropdownOption[]>(() =>
  commands.convertTargets(props.itemKey).map((type) => ({
    key: type,
    label: t(`elements.${type}.name`),
  })),
)
const wrapOptions = computed<DropdownOption[]>(() => [
  { key: 'card', label: t('elements.card.label') },
  { key: 'group', label: t('elements.group.label') },
  { key: 'collapse', label: t('elements.collapse.label') },
])

// 外层是一条白底胶囊（边框 + 阴影），按钮本身不再叠加边框 / 底色：图标用中性深色保证可读，
// 悬停变主题紫，删除悬停变红
const btnBase =
  '!h-[24px] !w-[24px] !rounded-[6px] !text-foreground/70 active:!scale-95 transition-[transform,background-color,color] duration-150'
const btnClass = `${btnBase} hover:!bg-[#a277ff]/12 hover:!text-[#a277ff]`
const dangerBtnClass = `${btnBase} hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950/50 dark:hover:!text-red-400`

function onWrapSelect(key: string | number) {
  commands.wrapIn([props.itemKey], key as 'card' | 'group' | 'collapse')
}
function onConvertSelect(key: string | number) {
  commands.convertTo(props.itemKey, String(key))
}

// ─── I3：贴近画布顶边时改贴元素内部右上角 ────────────────────────────────────────
// 工具条默认浮在选中元素外侧正上方（-top-[30px]，见下方 template）；元素本身贴着
// 画布滚动容器的可视顶边（或被顶栏这类 sticky 元素盖住）时，外侧位置会被裁掉/盖住，
// 这里探测后切到元素内部右上角（top-1 right-1）。
// 探测思路：不直接量工具条自己当前渲染出来的矩形（那样量出来的结果依赖它当前
// 到底贴在哪个位置，会来回抖动），而是只按选中元素（li）的矩形算出"贴外侧时大概
// 落在哪个像素点"，用 document.elementFromPoint 在真实渲染结果里探那个点——命中的
// 如果不是这个元素自己（或它所在的画布列表 <ul>），说明那个点被滚动容器裁掉了，
// 或者被顶栏这类更高层级的元素盖住了，两种情况通吃，不需要分别找滚动容器 /
// 顶栏元素各自的边界。
const rootEl = ref<HTMLElement | null>(null)
const pinnedInside = ref(false)
// 与下方 template 里 -top-[30px] 的偏移量保持一致
const OUTSIDE_OFFSET = 30

function measure() {
  const li = rootEl.value?.closest('[data-canvas-item]') as HTMLElement | null
  if (!li) return
  const liRect = li.getBoundingClientRect()
  const sampleY = liRect.top - OUTSIDE_OFFSET / 2
  if (sampleY < 0) {
    // 采样点已经跑到视口外，必然被裁
    pinnedInside.value = true
  } else {
    const sampleX = Math.min(window.innerWidth - 1, Math.max(0, liRect.right - 14))
    const hit = document.elementFromPoint(sampleX, sampleY)
    const list = li.closest('ul')
    const visible = !!hit && (li.contains(hit) || (list?.contains(hit) ?? false))
    pinnedInside.value = !visible
  }
  // 顺带把自己的宽度和贴内侧与否报给外层：宽度只在按钮集合变化时才会变（不会因为
  // 贴内 / 贴外切换而变，两种模式按钮完全一样），这里图省事每次 measure 都报一遍，
  // 反正只是父级里的两个数字，重复赋值同样的值不会触发额外渲染
  if (rootEl.value)
    emit('layout', { width: rootEl.value.offsetWidth, pinnedInside: pinnedInside.value })
}

let rafId = 0
function scheduleMeasure() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    measure()
  })
}

const positionClass = computed(() =>
  pinnedInside.value ? 'absolute top-1 right-1' : 'absolute -top-[30px] right-0',
)

let widthObserver: ResizeObserver | null = null
onMounted(() => {
  measure()
  // capture 阶段挂在 window 上：滚动事件本身不冒泡，capture 阶段却能从 window
  // 一路下探到真正发生滚动的祖先元素，不需要预先知道画布滚动容器具体是哪一个
  window.addEventListener('scroll', scheduleMeasure, true)
  window.addEventListener('resize', scheduleMeasure)
  // 按钮集合会变（比如转换为下拉的候选项数量随元素类型变化），宽度跟着变，不属于
  // 滚动/窗口缩放能触发的场景，单独用 ResizeObserver 盯自己的宽度
  if (typeof ResizeObserver !== 'undefined' && rootEl.value) {
    widthObserver = new ResizeObserver(() => measure())
    widthObserver.observe(rootEl.value)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleMeasure, true)
  window.removeEventListener('resize', scheduleMeasure)
  if (rafId) cancelAnimationFrame(rafId)
  widthObserver?.disconnect()
})
</script>

<template>
  <div
    ref="rootEl"
    :class="[
      positionClass,
      'z-40 flex items-center gap-0.5 rounded-[9px] border border-solid border-border/80 bg-card p-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:border-border/60 dark:bg-neutral-900',
    ]"
    data-testid="canvas-floating-toolbar"
    :data-pinned-inside="pinnedInside ? 'true' : 'false'"
    @pointerdown.stop
  >
    <n-tooltip placement="top">
      <template #trigger>
        <n-button
          quaternary
          size="small"
          :disabled="!canMoveUp"
          :aria-label="t('builder.commands.moveUp')"
          :class="btnClass"
          @click.stop="commands.moveUp(itemKey)"
        >
          <template #icon><span class="i-lucide-arrow-up !h-[14px] !w-[14px]"></span></template>
        </n-button>
      </template>
      {{ t('builder.commands.moveUpTooltip') }}
    </n-tooltip>

    <n-tooltip placement="top">
      <template #trigger>
        <n-button
          quaternary
          size="small"
          :disabled="!canMoveDown"
          :aria-label="t('builder.commands.moveDown')"
          :class="btnClass"
          @click.stop="commands.moveDown(itemKey)"
        >
          <template #icon><span class="i-lucide-arrow-down !h-[14px] !w-[14px]"></span></template>
        </n-button>
      </template>
      {{ t('builder.commands.moveDownTooltip') }}
    </n-tooltip>

    <n-tooltip placement="top">
      <template #trigger>
        <n-button
          quaternary
          size="small"
          :disabled="isSteps"
          :aria-label="t('builder.commands.duplicate')"
          :class="btnClass"
          @click.stop="commands.duplicate([itemKey])"
        >
          <template #icon><span class="i-lucide-copy-plus !h-[14px] !w-[14px]"></span></template>
        </n-button>
      </template>
      {{ t('builder.commands.duplicateTooltip') }}
    </n-tooltip>

    <!-- 包进容器 / 转换为：点开的是下拉菜单本身（已经用图标 + 展开的选项自解释），
         不再叠加 hover tooltip——同时悬停 + 点开会让 tooltip 气泡盖住下拉的第一项 -->
    <n-dropdown trigger="click" :options="wrapOptions" :disabled="!canWrap" @select="onWrapSelect">
      <n-button
        quaternary
        size="small"
        :disabled="!canWrap"
        :aria-label="t('builder.commands.wrapIn')"
        :title="t('builder.commands.wrapIn')"
        :class="btnClass"
        @click.stop
      >
        <template #icon><span class="i-lucide-box-select !h-[14px] !w-[14px]"></span></template>
      </n-button>
    </n-dropdown>

    <n-dropdown
      v-if="convertOptions.length"
      trigger="click"
      :options="convertOptions"
      @select="onConvertSelect"
    >
      <n-button
        quaternary
        size="small"
        :aria-label="t('builder.commands.convertTo')"
        :title="t('builder.commands.convertTo')"
        :class="btnClass"
        @click.stop
      >
        <template #icon><span class="i-lucide-replace !h-[14px] !w-[14px]"></span></template>
      </n-button>
    </n-dropdown>

    <n-tooltip placement="top">
      <template #trigger>
        <n-button
          quaternary
          size="small"
          :aria-label="t('builder.deleteField')"
          :class="dangerBtnClass"
          @click.stop="commands.remove([itemKey])"
        >
          <template #icon><span class="i-lucide-trash-2 !h-[14px] !w-[14px]"></span></template>
        </n-button>
      </template>
      {{ t('builder.commands.deleteTooltip') }}
    </n-tooltip>
  </div>
</template>
