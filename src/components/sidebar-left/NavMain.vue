<script setup lang="ts">
import { inject, computed, ref, watch, type Ref } from 'vue'
import { NTabs, NTabPane, NScrollbar, NInput, NEmpty, NButton } from 'naive-ui'
import { createFieldProps } from '@/elements'
import { createDefaultFormElements } from '@/elements'
import { getElementTypeBySchema } from '@/elements'
import DraggableList from './DraggableList.vue'
import StructureTree from './StructureTree.vue'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '../../i18n/context'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { FormNode } from '@/types/dsl'

const searchInput = inject('searchInput', ref(''))
const collapsed = inject('sidebarCollapsed', ref(false)) as Ref<boolean>
const { t } = useFormBuilderI18n()
const fieldProps = computed(() => createFieldProps(t))
const defaultFormElements = computed(() => createDefaultFormElements(t))
const panelTab = ref('elements')
const { formDefinition } = useFormBuilderState()

const filteredFormElements = computed(() => {
  if (!searchInput.value.trim()) {
    return defaultFormElements.value
  }

  const query = searchInput.value.toLowerCase()
  return defaultFormElements.value.filter(
    (element) =>
      element.name.toLowerCase().includes(query) ||
      element.description.toLowerCase().includes(query) ||
      String(element.$formkit ?? element.$cmp ?? '')
        .toLowerCase()
        .includes(query),
  )
})

const isSearching = computed(() => searchInput.value.trim().length > 0)

type ElementCategory = 'field' | 'container' | 'static'

const categories = computed<{ id: ElementCategory; label: string }[]>(() => [
  { id: 'field', label: t('fieldProps.category.fields') },
  { id: 'container', label: t('fieldProps.category.containers') },
  { id: 'static', label: t('fieldProps.category.static') },
])

const groupedElements = computed(() => {
  const groups: Record<ElementCategory, FormKitSchemaFormKit[]> = {
    field: [],
    container: [],
    static: [],
  }

  filteredFormElements.value.forEach((item) => {
    const typeName = getElementTypeBySchema(item) ?? String(item.$formkit ?? item.$cmp ?? '')
    const prop = fieldProps.value.find((p) => p.name === typeName)
    const category = prop?.category ?? 'field'
    // 布局元素（card / tabs / grid 等）并入容器分类展示
    const groupKey = category === 'layout' ? 'container' : (category as ElementCategory)
    if (groups[groupKey]) {
      groups[groupKey].push(item)
    }
  })

  return groups
})

// 搜索时跨三个分类汇总展示：只要有一个分类命中即视为有结果
const hasSearchResults = computed(() =>
  categories.value.some((category) => groupedElements.value[category.id].length > 0),
)

const clearSearch = () => {
  searchInput.value = ''
}

// ── F：最近使用（localStorage，try/catch 包裹；读写失败时整个区域不显示）────────
const RECENT_STORAGE_KEY = 'formkit-form-builder:recentElements'
const MAX_RECENT = 6

function isStorageAvailable(): boolean {
  try {
    const probeKey = '__formkit-form-builder-storage-probe__'
    localStorage.setItem(probeKey, '1')
    localStorage.removeItem(probeKey)
    return true
  } catch {
    return false
  }
}

// 模块加载期探测一次即可：结果不会在会话中途变化
const storageAvailable = isStorageAvailable()

function loadRecentTypes(): string[] {
  if (!storageAvailable) return []
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function saveRecentTypes(types: string[]) {
  if (!storageAvailable) return
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(types))
  } catch {
    // 配额已满 / 隐私模式等写入失败场景：静默忽略，不影响本次使用
  }
}

const recentTypes = ref<string[]>(loadRecentTypes())

function addRecentType(type: string) {
  if (!storageAvailable || !type) return
  const next = [type, ...recentTypes.value.filter((t2) => t2 !== type)].slice(0, MAX_RECENT)
  recentTypes.value = next
  saveRecentTypes(next)
}

function clearRecent() {
  recentTypes.value = []
  if (!storageAvailable) return
  try {
    localStorage.removeItem(RECENT_STORAGE_KEY)
  } catch {
    // 忽略
  }
}

// 按存储的类型顺序还原成可拖拽/可双击插入的面板元素（复用同一份默认元素池，
// 保证图标 / 名称 / 描述与当前语言一致，不用另存一份快照）
const recentElements = computed<FormKitSchemaFormKit[]>(() => {
  if (!storageAvailable || !recentTypes.value.length) return []
  const byType = new Map<string, FormKitSchemaFormKit>()
  for (const el of defaultFormElements.value) {
    const type = getElementTypeBySchema(el) ?? String(el.$formkit ?? el.$cmp ?? '')
    if (type && !byType.has(type)) byType.set(type, el)
  }
  const out: FormKitSchemaFormKit[] = []
  for (const type of recentTypes.value) {
    const el = byType.get(type)
    if (el) out.push(el)
  }
  return out
})

// 记录时机：面板拖出时暂记类型（见 DraggableList 的 drag-start），画布 schema 出现
// 一个此前不存在的、类型匹配的新节点时才确认为“成功放下”——避免拖拽被取消（松手在
// 无效区域）时也被误记为已使用。暂记设 8s 兜底超时，防止一次异常放弃后残留悬空状态。
type KeyTypeMap = Map<string, string>

function collectKeyTypes(nodes: FormNode[] | undefined, map: KeyTypeMap) {
  if (!Array.isArray(nodes)) return
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    if (typeof node.key === 'string' && node.key) map.set(node.key, node.type)
    collectKeyTypes((node as { children?: FormNode[] }).children, map)
  }
}

let pendingDragType: string | null = null
let pendingDragTimer: ReturnType<typeof setTimeout> | null = null
let knownKeyTypes: KeyTypeMap = new Map()
collectKeyTypes(formDefinition.value?.root?.children, knownKeyTypes)

function onPaletteDragStart(type: string) {
  if (!storageAvailable || !type) return
  pendingDragType = type
  if (pendingDragTimer) clearTimeout(pendingDragTimer)
  pendingDragTimer = setTimeout(() => {
    pendingDragType = null
    pendingDragTimer = null
  }, 8000)
}

watch(
  () => formDefinition.value,
  (def) => {
    const nextKeyTypes: KeyTypeMap = new Map()
    collectKeyTypes(def?.root?.children, nextKeyTypes)

    if (pendingDragType) {
      let matched = false
      for (const [key, type] of nextKeyTypes) {
        if (type === pendingDragType && !knownKeyTypes.has(key)) {
          matched = true
          break
        }
      }
      if (matched) {
        addRecentType(pendingDragType)
        pendingDragType = null
        if (pendingDragTimer) {
          clearTimeout(pendingDragTimer)
          pendingDragTimer = null
        }
      }
    }

    knownKeyTypes = nextKeyTypes
  },
)
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <n-scrollbar
      v-if="collapsed"
      class="h-full w-full"
      :x-scrollable="false"
      content-class="py-2 pr-4 pl-2"
    >
      <DraggableList :elements="filteredFormElements" @drag-start="onPaletteDragStart" />
    </n-scrollbar>
    <n-tabs
      v-else
      v-model:value="panelTab"
      type="segment"
      size="small"
      justify-content="space-evenly"
      class="h-full flex flex-col"
      pane-class="flex-1 overflow-hidden flex flex-col"
    >
      <n-tab-pane :key="'elements'" name="elements" :tab="t('sidebar.elements')">
        <div class="shrink-0 p-2 pb-0">
          <n-input :placeholder="t('sidebar.search')" v-model:value="searchInput" clearable />
        </div>

        <!-- F：搜索时跨三个分类汇总展示（带分类小标题），不必切页签 -->
        <div v-if="isSearching" class="flex-1 min-h-0 flex flex-col">
          <n-scrollbar
            v-if="hasSearchResults"
            class="h-full sidebar-scrollbar"
            content-class="pb-4 pr-4 pl-2 mb-2"
          >
            <div v-for="category in categories" :key="category.id">
              <template v-if="groupedElements[category.id].length">
                <div class="px-3 pt-3 pb-1 text-[10px] font-medium uppercase text-muted-foreground">
                  {{ category.label }}
                </div>
                <DraggableList
                  :elements="groupedElements[category.id]"
                  @drag-start="onPaletteDragStart"
                />
              </template>
            </div>
          </n-scrollbar>
          <div v-else class="flex-1 flex flex-col items-center justify-center gap-3 p-4">
            <n-empty :description="t('sidebar.noResults')" />
            <n-button size="small" @click="clearSearch">{{ t('sidebar.clearSearch') }}</n-button>
          </div>
        </div>

        <n-tabs
          v-else
          type="line"
          size="small"
          justify-content="space-evenly"
          class="flex-1 min-h-0 flex flex-col"
          pane-class="flex-1 overflow-hidden"
        >
          <n-tab-pane
            v-for="category in categories"
            :key="category.id"
            :name="category.id"
            :tab="category.label"
          >
            <n-scrollbar class="h-full sidebar-scrollbar" content-class="pb-4 pr-4 pl-2 mb-2">
              <!-- F：字段页签顶部显示最近使用（最多 6 个，本地存储失败时不显示本区） -->
              <div v-if="category.id === 'field' && recentElements.length" class="px-2 pt-2">
                <div class="flex items-center justify-between px-1 pb-1">
                  <span class="text-[10px] font-medium uppercase text-muted-foreground">{{
                    t('sidebar.recentlyUsed')
                  }}</span>
                  <button
                    type="button"
                    class="border-0 bg-transparent p-0 cursor-pointer text-[10px] text-muted-foreground hover:text-[#7c9ef8]"
                    @click="clearRecent"
                  >
                    {{ t('sidebar.clearRecent') }}
                  </button>
                </div>
                <DraggableList :elements="recentElements" @drag-start="onPaletteDragStart" />
                <div class="mx-3 my-1 border-0 border-t border-solid border-border/60"></div>
              </div>
              <DraggableList
                :elements="groupedElements[category.id]"
                @drag-start="onPaletteDragStart"
              />
            </n-scrollbar>
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane :key="'structure'" name="structure" :tab="t('sidebar.structure')">
        <div v-if="(formDefinition.root.children ?? []).length" class="h-full">
          <n-scrollbar class="h-full sidebar-scrollbar" content-class="p-2 pr-4 pl-2 mb-2">
            <StructureTree :nodes="formDefinition.root.children ?? []" />
          </n-scrollbar>
        </div>
        <div v-else class="flex h-full items-center justify-center">
          <n-empty :description="t('sidebar.structureEmpty')" />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
