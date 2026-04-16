<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { NTabs, NTabPane, NScrollbar } from 'naive-ui'
import { fieldProps } from '../../utils/field-props'
import { defaultFormElements } from '../../utils/default-form-elements'
import DraggableList from './DraggableList.vue'

const searchInput = inject('searchInput', ref(''))

const filteredFormElements = computed(() => {
  if (!searchInput.value.trim()) {
    return defaultFormElements // Return all elements if the search is empty
  }

  const query = searchInput.value.toLowerCase()
  return defaultFormElements.filter(
    (element) =>
      element.name.toLowerCase().includes(query) ||
      element.description.toLowerCase().includes(query) ||
      element.$formkit.toLowerCase().includes(query),
  )
})

type ElementCategory = 'fields' | 'structure' | 'static'

const categories: { id: ElementCategory; label: string }[] = [
  { id: 'fields', label: 'Fields' },
  { id: 'structure', label: 'Structure' },
  { id: 'static', label: 'Static' },
]

const groupedElements = computed(() => {
  const groups: Record<ElementCategory, typeof defaultFormElements> = {
    fields: [],
    structure: [],
    static: [],
  }

  filteredFormElements.value.forEach((item) => {
    const prop = fieldProps.find((p) => p.name === item.$formkit)
    const category = (prop?.category || 'fields') as ElementCategory
    if (groups[category]) {
      groups[category].push(item)
    }
  })

  return groups
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <n-tabs type="line" justify-content="space-evenly" class="h-full flex flex-col" pane-class="flex-1 overflow-hidden">
      <n-tab-pane
        v-for="category in categories"
        :key="category.id"
        :name="category.id"
        :tab="category.label"
      >
        <n-scrollbar class="h-full sidebar-scrollbar" content-class="pb-4 px-2">
          <DraggableList :elements="groupedElements[category.id]" />
        </n-scrollbar>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>
