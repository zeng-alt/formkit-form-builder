<script setup lang="ts">
// ═══ E1：结构树 ↔ 画布联动 ═══════════════════════════════════════════════════════
// 点击/悬停树节点联动画布：滚动定位 + 高亮复用 CanvasGridItem 已有的 dropFlash
// 计数器（drop-flash.ts）与画布上的 data-item-key 属性做只读 DOM 定位/浮层，
// 不改 CanvasGridItem.vue / ContainerChildrenGrid.vue。
import { computed, h, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { NTree, NButton, NInput, type TreeOption } from 'naive-ui'
import { getElementTypeDef } from '@/dsl/registry'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '@/i18n/context'
import {
  moveDslTo,
  removeDslNode,
  findDslNodeByKey,
  updateDslNodeAtKey,
} from '@/utils/schema/dsl-tree'
import { findNodeByKey, insertAfterAtPath } from '@/utils/schema/tree'
import { collectSchemaNames, duplicateNode } from '@/utils/dnd/schema'
import { triggerDropFlash } from '@/utils/dnd/drop-flash'
import {
  hideStructureHoverOverlay,
  scrollCanvasItemIntoView,
  showStructureHoverOverlay,
} from '@/utils/canvas-locate'
import type { FormNode } from '@/types/dsl'

const props = defineProps<{
  nodes: FormNode[]
}>()

const state = useFormBuilderState()
const { t } = useFormBuilderI18n()

interface StructureOption extends TreeOption {
  raw: FormNode
  icon: string
}

const childrenOf = (node: FormNode): FormNode[] => {
  if (node.category === 'container' || node.category === 'layout') {
    return (node as { children?: FormNode[] }).children ?? []
  }
  return []
}

const toTreeData = (nodes: FormNode[]): StructureOption[] =>
  nodes.map((node) => {
    const children = childrenOf(node)
    return {
      key: node.key ?? node.id,
      label: node.label || node.name || node.type,
      raw: node,
      icon: getElementTypeDef(node.type)?.icon ?? '',
      children: children.length ? toTreeData(children) : undefined,
    }
  })

const treeData = computed<StructureOption[]>(() => toTreeData(props.nodes))

const isContainer = (node: FormNode): boolean =>
  node.category === 'container' || node.category === 'layout'

const selectedKeys = computed(() => {
  const key = state.selectedKey.value
  return key ? [key] : []
})

function onUpdateSelectedKeys(keys: Array<string | number>) {
  const key = keys[0]
  if (typeof key !== 'string') return
  state.selectedTarget.value = 'field'
  state.selectedKey.value = key
  // 点击树节点：画布滚动到该元素并闪一下高亮（复用现有的 dropFlash 反馈通道，
  // CanvasGridItem.vue 已经按 __key 读这张表当 prop，这里只是再触发一次计数）
  scrollCanvasItemIntoView(key)
  triggerDropFlash([key])
}

function onDelete(option: StructureOption) {
  const key = option.raw.key ?? option.raw.id
  const root = state.formDefinition.value
  const next = removeDslNode(root.root.children ?? [], key)
  state.commitFormDefinition(
    { ...root, root: { ...root.root, children: next } },
    { reason: 'structure-delete' },
  )
  if (state.selectedKey.value === key) state.selectedKey.value = null
}

// E1：树节点「复制一份」——复用画布复制按钮同一套逻辑（duplicateNode 按数据作用域
// 决定是否保留子项原名，避免和画布上的复制按钮各写一套、结果不一致），任意深度的
// 节点都能定位（findNodeByKey 按 __key 深度优先查找）。
function onDuplicate(option: StructureOption) {
  const key = option.raw.key ?? option.raw.id
  const found = findNodeByKey(state.formSchema.value, key)
  if (!found) return
  const names = new Set<string>()
  collectSchemaNames(state.formSchema.value, names)
  const clone = duplicateNode(found.node as FormKitSchemaFormKit, names, {
    labelSuffix: t('common.copySuffix'),
  })
  const nextSchema = insertAfterAtPath(state.formSchema.value, found.path, clone)
  state.commitSchemaReconcile(nextSchema as FormKitSchemaFormKit[], { reason: 'duplicate' })

  const cloneKey = (clone as { __key?: string }).__key
  if (!cloneKey) return
  const root = state.formDefinition.value.root.children ?? []
  const foundDsl = findDslNodeByKey(root, cloneKey)
  if (foundDsl) {
    state.selectedTarget.value = 'field'
    state.selectedIndex.value = foundDsl.rootIndex
    state.selectedKey.value = cloneKey
  }
}

function onDrop({
  node,
  dragNode,
  dropPosition,
}: {
  node: TreeOption
  dragNode: TreeOption
  dropPosition: 'before' | 'inside' | 'after'
}) {
  const dragKey = String(dragNode.key)
  const targetKey = String(node.key)
  if (dragKey === targetKey) return
  const root = state.formDefinition.value
  const next = moveDslTo(root.root.children ?? [], dragKey, targetKey, dropPosition)
  if (next) {
    state.commitFormDefinition(
      { ...root, root: { ...root.root, children: next } },
      { reason: 'structure-dnd', merge: true },
    )
    state.selectedKey.value = dragKey
  }
}

const allowDrop = ({ dropPosition, node }: { dropPosition: string; node: TreeOption }) => {
  if (dropPosition === 'inside') {
    return isContainer((node as StructureOption).raw)
  }
  return true
}

// ─── E1：双击树节点标签内联重命名（Enter 确认 / Esc 取消）────────────────────────
const editingKey = ref<string | null>(null)
const editingValue = ref('')

function startRename(option: StructureOption) {
  editingKey.value = String(option.key)
  editingValue.value = (option.label as string) ?? ''
}

function cancelRename() {
  editingKey.value = null
}

function confirmRename() {
  const key = editingKey.value
  editingKey.value = null
  if (!key) return
  const value = editingValue.value.trim()
  if (!value) return
  const root = state.formDefinition.value.root.children ?? []
  const found = findDslNodeByKey(root, key)
  if (!found || found.node.label === value) return
  const { nodes: nextChildren, found: didUpdate } = updateDslNodeAtKey(root, key, {
    ...found.node,
    label: value,
  } as FormNode)
  if (!didUpdate) return
  const def = state.formDefinition.value
  state.commitFormDefinition(
    { ...def, root: { ...def.root, children: nextChildren } },
    { reason: 'structure-rename' },
  )
}

// ─── E1：悬停树节点——在画布对应元素上显示悬停虚线框（body 浮层，不改 D 的文件）──
function nodeProps({ option }: { option: TreeOption }) {
  const key = String(option.key)
  return {
    onMouseenter: () => showStructureHoverOverlay(key),
    onMouseleave: () => hideStructureHoverOverlay(),
    onDblclick: (e: MouseEvent) => {
      // 双击落在删除/复制按钮上时不触发重命名（按钮自己的 click 已经 stopPropagation，
      // 但 dblclick 由 nodeProps 挂在整行上，这里按目标元素再兜底一次）
      if ((e.target as HTMLElement | null)?.closest('button')) return
      startRename(option as StructureOption)
    },
  }
}

onBeforeUnmount(() => {
  hideStructureHoverOverlay()
})

// ─── E1：画布选中变化时，树滚动到可见位置（default-expand-all 恒为真，天然已展开）──
const treeRootRef = ref<HTMLElement | null>(null)
watch(
  () => state.selectedKey.value,
  async () => {
    await nextTick()
    const el = treeRootRef.value?.querySelector('.n-tree-node--selected')
    el?.scrollIntoView({ block: 'nearest' })
  },
)

const renderPrefix = ({ option }: { option: TreeOption }) => {
  const icon = (option as StructureOption).icon
  return icon
    ? h('span', { class: `${icon} h-3.5 w-3.5 shrink-0 text-muted-foreground` })
    : h('span', { class: 'h-3.5 w-3.5 shrink-0' })
}

const renderLabel = ({ option }: { option: TreeOption }) => {
  const opt = option as StructureOption
  const key = String(opt.key)
  if (editingKey.value === key) {
    return h(NInput, {
      size: 'small',
      value: editingValue.value,
      autofocus: true,
      placeholder: t('structure.renamePlaceholder'),
      'onUpdate:value': (v: string) => {
        editingValue.value = v
      },
      onKeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          confirmRename()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cancelRename()
        }
      },
      onBlur: () => confirmRename(),
      onClick: (e: MouseEvent) => e.stopPropagation(),
      onMousedown: (e: MouseEvent) => e.stopPropagation(),
    })
  }
  return h('span', { class: 'truncate', title: t('structure.renameHint') }, opt.label as string)
}

const renderSuffix = ({ option }: { option: TreeOption }) => {
  const opt = option as StructureOption
  return h('span', { class: 'flex items-center gap-0.5' }, [
    h(
      NButton,
      {
        text: true,
        size: 'small',
        'aria-label': t('structure.duplicateNode'),
        onClick: (e: MouseEvent) => {
          e.stopPropagation()
          onDuplicate(opt)
        },
      },
      { icon: () => h('span', { class: 'i-lucide-copy h-3 w-3' }) },
    ),
    h(
      NButton,
      {
        text: true,
        type: 'error',
        size: 'small',
        onClick: (e: MouseEvent) => {
          e.stopPropagation()
          onDelete(opt)
        },
      },
      { icon: () => h('span', { class: 'i-lucide-trash-2 h-3 w-3' }) },
    ),
  ])
}
</script>

<template>
  <div ref="treeRootRef" class="structure-tree overflow-x-auto">
    <n-tree
      selectable
      draggable
      block-line
      default-expand-all
      :data="treeData"
      :selected-keys="selectedKeys"
      :show-line="true"
      :ellipsis="false"
      :allow-drop="allowDrop"
      :node-props="nodeProps"
      :render-prefix="renderPrefix"
      :render-label="renderLabel"
      :render-suffix="renderSuffix"
      @update:selected-keys="onUpdateSelectedKeys"
      @drop="onDrop"
      style="min-width: max-content"
    />
  </div>
</template>

<style scoped>
.structure-tree :deep(.n-tree-node-indent--show-line::before) {
  border-left-style: dashed;
  border-left-width: 2px;
  border-color: var(--border);
}
.structure-tree :deep(.n-tree-node-indent--show-line--is-leaf::after) {
  border-bottom-style: dashed;
  border-bottom-width: 2px;
  border-color: var(--border);
}
</style>
