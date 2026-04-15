<script setup lang="ts">
import { watch } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { fieldProps } from '../../utils/field-props'

const props = defineProps<{
  elements: any[]
}>()

const [parentRef, items] = useDragAndDrop(props.elements, {
  group: 'form-builder',
  sortable: false,
  nativeDrag: true,
  draggable: () => true,
  handleNodePointerup(data) {
    data.targetData.node.el.setAttribute('draggable', 'true')
  },
  // @ts-ignore - We only need dynamicValues, ignoring missing insertPoint
  insertConfig: {
    dynamicValues: (data: any) => {
      // Deep clone the elements so that modifying the canvas elements 
      // doesn't affect the sidebar source elements.
      return data.draggedNodes.map((node: any) => JSON.parse(JSON.stringify(node.data.value)))
    }
  },
  onTransfer() {
    // When an item is transferred out of this list, the drag-and-drop library removes it from `items.value`.
    // We want to act like a "clone" source, so we immediately restore the original items.
    items.value = [...props.elements]
  }
})

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
