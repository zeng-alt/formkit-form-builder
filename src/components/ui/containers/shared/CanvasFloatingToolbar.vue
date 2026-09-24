<script setup lang="ts">
// ═══ D3：浮动工具条 ═════════════════════════════════════════════════════════════
// 单选一个元素时，浮在其右上角外侧的紧凑工具条：上移 / 下移 / 复制一份 /
// 包进容器（下拉） / 转换为（下拉） / 删除。所有操作都调用 D0 命令层，
// 跟右键菜单 / 快捷键完全共用同一份实现。
import { computed } from 'vue'
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
</script>

<template>
  <div
    class="absolute -top-[30px] right-0 z-40 flex items-center gap-0.5 rounded-[9px] border border-solid border-border/80 bg-card p-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.12)] dark:border-border/60 dark:bg-neutral-900"
    data-testid="canvas-floating-toolbar"
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
