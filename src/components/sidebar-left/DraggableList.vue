<script setup lang="ts">
import { computed, inject, ref, watch, type Ref } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { createFieldProps } from '@/elements'
import { getElementTypeBySchema } from '@/elements'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useFormBuilderI18n } from '../../i18n/context'
import { customInsertPlugin } from '../../utils/custom-insert-plugin'

const props = defineProps<{
  elements: FormKitSchemaFormKit[]
}>()

const { t } = useFormBuilderI18n()
const fieldProps = computed(() => createFieldProps(t))
const collapsed = inject('sidebarCollapsed', ref(false))

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
  onDragend() {
    items.value = [...props.elements]
  },
  plugins: [
    customInsertPlugin({
      insertPoint: () => {
        const div = document.createElement('div')
        Object.assign(div.style, {
          position: 'absolute',
          width: '0px',
          height: '0px',
          pointerEvents: 'none',
          opacity: '0',
        })
        return div
      },
    }),
  ],
}

const [parentRef, items] = useDragAndDrop(
  props.elements,
  dragConfig as unknown as Parameters<typeof useDragAndDrop>[1],
) as unknown as [Ref<HTMLElement | null>, Ref<FormKitSchemaFormKit[]>]

const getTypeName = (item: any) => {
  return getElementTypeBySchema(item) ?? String(item?.$formkit ?? item?.$cmp ?? '')
}

// Sync items when props.elements changes (e.g. during search)
watch(
  () => props.elements,
  (newElements) => {
    items.value = newElements
  },
  { deep: true },
)
</script>

<template>
  <div
    ref="parentRef"
    data-is-source="true"
    :class="
      collapsed ? 'grid grid-cols-1 justify-items-center gap-2 pt-2 px-2 pb-2 pl-0 min-h-[50px] w-full' : 'flex flex-col gap-1 p-2 min-h-[50px] w-full'
    "
  >
    <div
      v-for="item in items"
      :key="item.name"
      :class="[
        collapsed
          ? 'h-48px w-48px rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab flex items-center justify-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
          : 'p-8px rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab flex items-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700',
        item.name.trim().replace(/\s+/g, '-').toLowerCase(),
      ]"
    >
      <div v-if="collapsed">
        <n-popover placement="right">
          <template #trigger>
            <div class="h-32px w-32px rounded-md flex items-center justify-center">
              <span
                :class="`${fieldProps.find((prop) => prop.name === getTypeName(item))?.icon ?? ''} h-16px w-16px`"
              />
            </div>
          </template>
          <div>
            {{ item.name.trim() }}
          </div>
        </n-popover>
      </div>
      <span
        v-else
        :class="`${fieldProps.find((prop) => prop.name === getTypeName(item))?.icon ?? ''} h-5 w-5 shrink-0`"
      ></span>
      <div v-if="!collapsed" class="ml-3 flex flex-col justify-center overflow-hidden">
        <span class="text-[11px] text-secondary-foreground/80 font-medium">{{ item.name }}</span>
        <span class="text-[9px] text-muted-foreground truncate">{{ item.description }}</span>
      </div>
    </div>
  </div>
</template>
