<script setup lang="ts">
// ═══ D4：画布右键菜单 ═══════════════════════════════════════════════════════════
// 元素上右键：复制 / 剪切 / 粘贴 / 复制一份 / 上移 / 下移 / 包进容器 ▸ / 转换为 ▸ /
// 删除；画布空白处右键：粘贴 / 全选根级元素。多选时对全部选中元素生效，不支持
// 的项（粘贴 / 上移 / 下移 / 转换为）置灰。用 naive-ui NDropdown（trigger="manual"
// + x/y）实现，选中未选中的元素时（悬停「⋯」按钮点开）同一份菜单也复用。
import { computed, onBeforeUnmount, watch } from 'vue'
import { NDropdown, type DropdownOption } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useCanvasCommands } from '@/builder/composables/use-canvas-commands'
import { findNodeByKey } from '@/utils/schema/tree'
import { getElementTypeBySchema } from '@/elements'
import type { SchemaNode } from '@/utils/schema/types'

const props = defineProps<{
  show: boolean
  x: number
  y: number
  /** 菜单作用的 key 列表；空数组表示画布空白处的菜单（粘贴 / 全选根级元素） */
  targetKeys: string[]
  /** 空白处粘贴的落点：所在容器的 __key（根画布传 null）。仅在 targetKeys 为空时使用。 */
  blankTargetKey?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { t } = useFormBuilderI18n()
const state = useFormBuilderState()
const commands = useCanvasCommands(state)

const isBlank = computed(() => props.targetKeys.length === 0)
const isMulti = computed(() => props.targetKeys.length > 1)
const soloKey = computed(() => (props.targetKeys.length === 1 ? props.targetKeys[0]! : null))

const dangerStyle = { color: '#d03050' }

const options = computed<DropdownOption[]>(() => {
  if (isBlank.value) {
    return [
      {
        key: 'paste',
        label: `${t('builder.commands.paste')}（Ctrl/Cmd+V）`,
        disabled: !commands.canPaste.value,
      },
      { key: 'd1', type: 'divider' },
      { key: 'selectAllRoot', label: t('builder.commands.selectAllRoot') },
    ]
  }

  const keys = props.targetKeys
  const wrapChildren: DropdownOption[] = [
    { key: 'wrap:card', label: t('elements.card.label') },
    { key: 'wrap:group', label: t('elements.group.label') },
    { key: 'wrap:collapse', label: t('elements.collapse.label') },
  ]
  const convertTargets = soloKey.value ? commands.convertTargets(soloKey.value) : []
  const schema = state.formSchema.value as unknown as SchemaNode[]
  const hasSteps = keys.some(
    (k) => getElementTypeBySchema(findNodeByKey(schema, k)?.node) === 'steps',
  )

  const list: DropdownOption[] = [
    { key: 'copy', label: `${t('builder.commands.copy')}（Ctrl/Cmd+C）` },
    { key: 'cut', label: `${t('builder.commands.cut')}（Ctrl/Cmd+X）` },
    {
      key: 'paste',
      label: `${t('builder.commands.paste')}（Ctrl/Cmd+V）`,
      disabled: isMulti.value || !commands.canPaste.value,
    },
    {
      key: 'duplicate',
      label: `${t('builder.commands.duplicate')}（Ctrl/Cmd+D）`,
      disabled: hasSteps,
    },
    { key: 'd1', type: 'divider' },
    {
      key: 'moveUp',
      label: t('builder.commands.moveUp'),
      disabled: isMulti.value || !soloKey.value || !commands.canMoveUp(soloKey.value),
    },
    {
      key: 'moveDown',
      label: t('builder.commands.moveDown'),
      disabled: isMulti.value || !soloKey.value || !commands.canMoveDown(soloKey.value),
    },
    { key: 'd2', type: 'divider' },
    {
      key: 'wrap',
      label: t('builder.commands.wrapIn'),
      disabled: !commands.canWrap(keys),
      children: wrapChildren,
    },
    {
      key: 'convert',
      label: t('builder.commands.convertTo'),
      disabled: isMulti.value || convertTargets.length === 0,
      // 用类型名（如「文本域」），不用 .label（新建该类型元素时的示例标签文案）
      children: convertTargets.map((type) => ({
        key: `convert:${type}`,
        label: t(`elements.${type}.name`),
      })),
    },
    { key: 'd3', type: 'divider' },
    {
      key: 'delete',
      label: `${t('builder.deleteField')}（Delete）`,
      props: { style: dangerStyle },
    },
  ]
  return list
})

function close() {
  emit('update:show', false)
}

// trigger="manual" 的 NDropdown 不会自带 Esc 关闭（那是内部维护开合状态的
// trigger 才有的行为），显示期间挂一个 keydown 监听自己关，隐藏时立刻摘掉
watch(
  () => props.show,
  (show) => {
    if (show) {
      document.addEventListener('keydown', onKeydown, true)
      // 打开菜单时探一次系统剪贴板，避免"粘贴"项因为页面刚打开、内存剪贴板还是
      // 空的而显示为不可用（其实系统剪贴板里可能有别的标签页复制的内容）
      void commands.refreshCanPaste()
    } else {
      document.removeEventListener('keydown', onKeydown, true)
    }
  },
)
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
}
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
})

function onSelect(key: string) {
  close()
  if (key === 'selectAllRoot') {
    commands.selectAllRoot()
    return
  }
  if (key === 'paste') {
    void commands.paste(
      isBlank.value ? (props.blankTargetKey ?? null) : (soloKey.value ?? undefined),
    )
    return
  }
  if (isBlank.value) return
  const keys = props.targetKeys
  if (key === 'copy') return commands.copy(keys)
  if (key === 'cut') return commands.cut(keys)
  if (key === 'duplicate') return commands.duplicate(keys)
  if (key === 'delete') return commands.remove(keys)
  if (key === 'moveUp' && soloKey.value) return commands.moveUp(soloKey.value)
  if (key === 'moveDown' && soloKey.value) return commands.moveDown(soloKey.value)
  if (key.startsWith('wrap:')) {
    commands.wrapIn(keys, key.slice(5) as 'card' | 'group' | 'collapse')
    return
  }
  if (key.startsWith('convert:') && soloKey.value) {
    commands.convertTo(soloKey.value, key.slice(8))
    return
  }
}
</script>

<template>
  <n-dropdown
    placement="bottom-start"
    trigger="manual"
    :show="props.show"
    :x="props.x"
    :y="props.y"
    :options="options"
    data-testid="canvas-context-menu"
    @select="onSelect"
    @clickoutside="close"
  />
</template>
