<script setup lang="ts">
import { inject, computed, ref, type Ref } from 'vue'
import { NTabs, NTabPane, NScrollbar } from 'naive-ui'
import { createPaletteItems, type PaletteCategory, type PaletteItem } from '../../utils/palette-elements'
import DraggableList from './DraggableList.vue'
import { useFormBuilderI18n } from '../../i18n/context'

const searchInput = inject('searchInput', ref(''))
const collapsed = inject('sidebarCollapsed', ref(false)) as Ref<boolean>
const { t } = useFormBuilderI18n()
const palette = computed(() => createPaletteItems(t))

const filteredFormElements = computed(() => {
  if (!searchInput.value.trim()) {
    return palette.value
  }

  const query = searchInput.value.toLowerCase()
  return palette.value.filter(
    (item) =>
      item.name.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.key.toLowerCase().includes(query),
  )
})

const categories = computed<{ id: PaletteCategory; label: string }[]>(() => [
  { id: 'fields', label: t('fieldProps.category.fields') },
  { id: 'static', label: t('fieldProps.category.static') },
])

const groupedElements = computed(() => {
  const groups: Record<PaletteCategory, PaletteItem[]> = {
    fields: [],
    static: [],
  }

  filteredFormElements.value.forEach((item) => {
    groups[item.category].push(item)
  })

  return groups
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <n-scrollbar v-if="collapsed" class="h-full sidebar-scrollbar" content-class="py-2 px-1">
      <DraggableList :elements="filteredFormElements" />
    </n-scrollbar>
    <n-tabs
      v-else
      type="line"
      size="small"
      justify-content="space-evenly"
      class="h-full flex flex-col"
      pane-class="flex-1 overflow-hidden"
    >
      <n-tab-pane v-for="category in categories" :key="category.id" :name="category.id" :tab="category.label">
        <n-scrollbar class="h-full sidebar-scrollbar" content-class="pb-4 px-2">
          <DraggableList :elements="groupedElements[category.id]" />
        </n-scrollbar>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
