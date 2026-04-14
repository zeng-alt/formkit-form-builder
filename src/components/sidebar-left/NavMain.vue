<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import { fieldProps } from '../../utils/field-props'
import { defaultFormElements } from '../../utils/field-props'
import { cn } from '../../utils/utils'

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
  <div class="h-full overflow-y-auto pb-4">
    <template v-for="category in categories" :key="category.id">
      <div v-if="groupedElements[category.id].length > 0">
        <div class="px-2 pt-2 font-medium text-sm text-gray-500">{{ category.label }}</div>
        <div class="flex flex-col gap-1 p-2">
          <div
            v-for="item in groupedElements[category.id]"
            :key="item.name"
            :class="[
              'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center',
              item.name.trim().replace(/\s+/g, '-').toLowerCase(),
            ]"
          >
            <component
              :is="fieldProps.find((prop) => prop.name === item.$formkit)?.icon"
              class="h-4 w-4 shrink-0"
            />
            <div class="ml-3 flex flex-col justify-center overflow-hidden">
              <span class="text-[11px] text-secondary-foreground/80 font-medium">{{
                item.name
              }}</span>
              <span class="text-[9px] text-muted-foreground truncate">{{ item.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
