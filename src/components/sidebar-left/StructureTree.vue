<script setup lang="ts">
import { computed, h } from 'vue'
import { NTree, NButton, type TreeOption } from 'naive-ui'
import { getElementTypeDef } from '@/dsl/registry'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { moveDslTo, removeDslNode } from '@/utils/schema/dsl-tree'
import type { FormNode } from '@/types/dsl'

const props = defineProps<{
  nodes: FormNode[]
}>()

const state = useFormBuilderState()

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

const renderPrefix = ({ option }: { option: TreeOption }) => {
  const icon = (option as StructureOption).icon
  return icon
    ? h('span', { class: `${icon} h-3.5 w-3.5 shrink-0 text-muted-foreground` })
    : h('span', { class: 'h-3.5 w-3.5 shrink-0' })
}

const renderSuffix = ({ option }: { option: TreeOption }) => {
  const opt = option as StructureOption
  return h(
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
    {
      icon: () => h('span', { class: 'i-lucide-trash-2 h-3 w-3' }),
    },
  )
}
</script>

<template>
  <div class="structure-tree overflow-x-auto">
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
      :render-prefix="renderPrefix"
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
