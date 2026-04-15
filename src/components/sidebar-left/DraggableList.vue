<script setup lang="ts">
import { watch, type Ref } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { fieldProps } from '../../utils/field-props'
import type { FormKitSchemaFormKit } from '@formkit/core'

const props = defineProps<{
  elements: FormKitSchemaFormKit[]
}>()

type PointerupData = { targetData: { node: { el: HTMLElement } } }
type DynamicValuesData = { draggedNodes: Array<{ data: { value: FormKitSchemaFormKit } }> }

const dragConfig = {
  group: 'form-builder',
  sortable: false,
  nativeDrag: true,
  draggable: () => true,
  handleNodePointerup(data: PointerupData) {
    data.targetData.node.el.setAttribute('draggable', 'true')
  },
  insertConfig: {
    dynamicValues: (data: DynamicValuesData) => {
      return data.draggedNodes.map((node) => JSON.parse(JSON.stringify(node.data.value)))
    },
  },
  onTransfer() {
    items.value = [...props.elements]
  },
}

const [parentRef, items] = useDragAndDrop(
  props.elements,
  dragConfig as unknown as Parameters<typeof useDragAndDrop>[1],
) as unknown as [Ref<HTMLElement | null>, Ref<FormKitSchemaFormKit[]>]

// Sync items when props.elements changes (e.g. during search)
watch(() => props.elements, (newElements) => {
  items.value = newElements
}, { deep: true })
</script>

<template>
  <div ref="parentRef" data-is-source="true" class="flex flex-col gap-1 p-2 min-h-[50px]">
    <div
      v-for="item in items"
      :key="item.name"
      :class="[
        'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab flex items-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700',
        item.name.trim().replace(/\s+/g, '-').toLowerCase(),
      ]"
    >
      <component
        :is="fieldProps.find((prop) => prop.name === item.$formkit)?.icon"
        class="h-4 w-4 shrink-0"
      />
      <div class="ml-3 flex flex-col justify-center overflow-hidden">
        <span class="text-[11px] text-secondary-foreground/80 font-medium">{{ item.name }}</span>
        <span class="text-[9px] text-muted-foreground truncate">{{ item.description }}</span>
      </div>
    </div>
  </div>
</template>
