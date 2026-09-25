<script setup lang="ts">
import { NPopover, NTooltip } from 'naive-ui'
import { computed, inject, ref, watch, type Ref } from 'vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { createFieldProps } from '@/elements'
import { getElementTypeBySchema } from '@/elements'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { useFormBuilderI18n } from '../../i18n/context'
import { customInsertPlugin } from '../../utils/custom-insert-plugin'
import { createPaletteDragImage } from '../../utils/dnd/drag-image'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { preloadElementComponents } from '@/elements/component-loader'
import { findNodeByKey, updateAtPath } from '@/utils/schema/tree'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'
import { collectSchemaNames, duplicateNode } from '@/utils/dnd/schema'

const props = defineProps<{
  elements: FormKitSchemaFormKit[]
}>()

const emit = defineEmits<{
  /** F：面板拖拽开始（成功放下与否留给放下后确认），携带拖出元素的类型，
   *  供 NavMain 记录「最近使用」 */
  (e: 'drag-start', type: string): void
}>()

const { t } = useFormBuilderI18n()
const fieldProps = computed(() => createFieldProps(t))
const collapsed = inject('sidebarCollapsed', ref(false))
// F：搜索高亮——与 NavMain 的搜索框共用同一个注入值
const searchInput = inject('searchInput', ref(''))

type PointerupData = { targetData: { node: { el: HTMLElement } } }
type DynamicValuesData = { draggedNodes: Array<{ data: { value: FormKitSchemaFormKit } }> }
type DragImageData = {
  e: DragEvent
  targetData: { node: { data: { value: FormKitSchemaFormKit } } }
}

const dragConfig = {
  group: 'form-builder',
  sortable: false,
  nativeDrag: true,
  draggable: () => true,
  handleNodePointerup(data: PointerupData) {
    data.targetData.node.el.setAttribute('draggable', 'true')
  },
  // L5：从面板拖出时用紧凑的胶囊（图标 + 名称）当拖拽影像，而不是整个面板条目的截图。
  // @formkit/drag-and-drop 只负责把这里返回的元素交给 dataTransfer.setDragImage
  // 之前的收尾（挂到 body、drag 结束后自动移除），实际调用 setDragImage 在
  // createPaletteDragImage 里——库本身的 dragImage 钩子并不会替调用方调这一步。
  dragImage(data: DragImageData) {
    const value = data.targetData.node.data.value
    const el = createPaletteDragImage(iconOf(value), String(value?.name ?? ''))
    data.e.dataTransfer?.setDragImage(el, 16, 16)
    // F：拖拽开始那一刻就是本库唯一"确定拖了谁"的时机（放下是否成功交给
    // NavMain 那边监听 formDefinition 变化来确认，见该文件的说明）
    const typeName = getTypeName(value)
    emit('drag-start', typeName)
    // X：刚拖出来就是"马上要用到这个类型"的强信号，不等空闲预加载，立即预取
    // （按需加载类型才会真的发起 import，其余类型直接跳过，见 component-loader.ts）
    void preloadElementComponents([typeName])
    return el
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
    customInsertPlugin(
      {
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
      },
      // 调色板是纯拖拽源（不属于任何画布、从不作为落点），显式传 null：
      // 提交时 ctx 一律从落点 parent 读取，这里不需要也不应该有上下文。
      null,
    ),
  ],
}

const [parentRef, items] = useDragAndDrop(
  props.elements,
  dragConfig as unknown as Parameters<typeof useDragAndDrop>[1],
) as unknown as [Ref<HTMLElement | null>, Ref<FormKitSchemaFormKit[]>]

const getTypeName = (item: any) => {
  return getElementTypeBySchema(item) ?? String(item?.$formkit ?? item?.$cmp ?? '')
}

// 面板项图标：便捷预置项自带 __paletteIcon（schema 类型是 list 无法反查嵌套列表图标），
// 否则按类型查 fieldProps
const iconOf = (item: any) =>
  (item?.__paletteIcon as string | undefined) ??
  fieldProps.value.find((prop) => prop.name === getTypeName(item))?.icon ??
  ''

// Sync items when props.elements changes (e.g. during search)
watch(
  () => props.elements,
  (newElements) => {
    items.value = newElements
  },
  { deep: true },
)

// F：搜索命中片段高亮——按查询词把文本切成命中 / 非命中片段，模板里分别渲染
type TextPart = { text: string; hit: boolean }
const highlightParts = (text: string, query: string): TextPart[] => {
  const q = query.trim()
  if (!q) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const lowerQ = q.toLowerCase()
  const parts: TextPart[] = []
  let cursor = 0
  while (cursor < text.length) {
    const idx = lower.indexOf(lowerQ, cursor)
    if (idx === -1) {
      parts.push({ text: text.slice(cursor), hit: false })
      break
    }
    if (idx > cursor) parts.push({ text: text.slice(cursor, idx), hit: false })
    parts.push({ text: text.slice(idx, idx + lowerQ.length), hit: true })
    cursor = idx + lowerQ.length
  }
  return parts.length ? parts : [{ text, hit: false }]
}

// F：双击追加到画布——选中的是这几类容器时追加进其内部，否则追加到根画布末尾；
// 复用与拖放一致的 key/name 生成（duplicateNode），提交走统一漏斗，追加后选中新节点。
// 按钮组 / 搜索区 / 标签页 / 步骤条等有专属收纳规则的容器不在此列，双击时退化为根画布追加。
const OPEN_CONTAINER_TYPES = new Set(['card', 'group', 'inputGroup', 'collapse'])

const builderState = useFormBuilderState()

const appendElement = (item: FormKitSchemaFormKit) => {
  const schema = builderState.formSchema.value as SchemaNode[]
  const existingNames = new Set<string>()
  collectSchemaNames(schema, existingNames)
  const clone = duplicateNode(item, existingNames) as SchemaNode

  const selKey = builderState.selectedKey.value
  const selFound = selKey ? findNodeByKey(schema, selKey) : null
  const selType = selFound ? getElementTypeBySchema(selFound.node) : undefined

  let nextSchema: FormKitSchemaFormKit[]
  if (selFound && selType && OPEN_CONTAINER_TYPES.has(selType)) {
    const nextNode: SchemaNode = {
      ...selFound.node,
      children: [...schemaChildren(selFound.node), clone],
    }
    nextSchema = updateAtPath(schema, selFound.path, nextNode) as FormKitSchemaFormKit[]
  } else {
    nextSchema = [...schema, clone] as FormKitSchemaFormKit[]
  }

  builderState.commitSchemaReconcile(nextSchema, { reason: 'dnd' })

  const cloneKey = clone.__key
  if (cloneKey) {
    const after = findNodeByKey(builderState.formSchema.value as SchemaNode[], cloneKey)
    builderState.selectedTarget.value = 'field'
    builderState.selectedKey.value = cloneKey
    if (after) builderState.selectedIndex.value = after.rootIndex
    builderState.selectedColumnIndex.value = null
  }
}
</script>

<template>
  <div
    ref="parentRef"
    data-is-source="true"
    :class="
      collapsed
        ? 'grid grid-cols-1 justify-items-center gap-2 pt-2 px-2 pb-2 pl-0 min-h-[50px] w-full'
        : 'grid grid-cols-2 gap-2 p-2 min-h-[50px] w-full'
    "
  >
    <div
      v-for="item in items"
      :key="item.name"
      :class="[
        collapsed
          ? 'h-48px w-48px rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab flex items-center justify-center border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
          : 'p-8px rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-grab flex items-center overflow-hidden border border-transparent hover:border-gray-200 dark:hover:border-gray-700',
        item.name.trim().replace(/\s+/g, '-').toLowerCase(),
      ]"
      :data-palette-type="getTypeName(item)"
      @dblclick="appendElement(item)"
    >
      <div v-if="collapsed">
        <n-popover placement="right" :delay="400">
          <template #trigger>
            <div class="h-32px w-32px rounded-md flex items-center justify-center">
              <span :class="`${iconOf(item)} h-16px w-16px`" />
            </div>
          </template>
          <div>
            {{ item.name.trim() }}
          </div>
        </n-popover>
      </div>
      <n-tooltip v-else placement="top" :delay="400" trigger="hover">
        <template #trigger>
          <div class="flex items-center gap-2 w-full overflow-hidden">
            <span :class="`${iconOf(item)} h-4 w-4 shrink-0 text-secondary-foreground/80`" />
            <span class="text-[11px] text-secondary-foreground/80 font-medium truncate">
              <template v-for="(part, i) in highlightParts(item.name, searchInput)" :key="i">
                <mark
                  v-if="part.hit"
                  class="rounded-[2px] bg-[rgba(162,119,255,0.35)] px-[1px] text-inherit"
                  >{{ part.text }}</mark
                >
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
          </div>
        </template>
        <div class="max-w-56 text-xs leading-snug">
          <template v-for="(part, i) in highlightParts(item.description, searchInput)" :key="i">
            <mark
              v-if="part.hit"
              class="rounded-[2px] bg-[rgba(162,119,255,0.35)] px-[1px] text-inherit"
              >{{ part.text }}</mark
            >
            <template v-else>{{ part.text }}</template>
          </template>
        </div>
      </n-tooltip>
    </div>
  </div>
</template>
