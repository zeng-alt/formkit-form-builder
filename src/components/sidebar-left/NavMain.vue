<script setup lang="ts">
import { inject, computed, ref, type Ref } from 'vue'
import { NTabs, NTabPane, NScrollbar, NInput, NEmpty } from 'naive-ui'
import { createFieldProps } from '@/elements'
import { createDefaultFormElements } from '@/elements'
import { getElementTypeBySchema } from '@/elements'
import DraggableList from './DraggableList.vue'
import StructureTree from './StructureTree.vue'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { useFormBuilderI18n } from '../../i18n/context'
import type { FormKitSchemaFormKit } from '@formkit/core'

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
      String((element as any).$formkit ?? (element as any).$cmp ?? '')
        .toLowerCase()
        .includes(query),
  )
})

type ElementCategory = 'field' | 'container' | 'layout' | 'static'

const categories = computed<{ id: ElementCategory; label: string }[]>(() => [
  { id: 'field', label: t('fieldProps.category.fields') },
  { id: 'container', label: t('fieldProps.category.containers') },
  { id: 'layout', label: t('fieldProps.category.layouts') },
  { id: 'static', label: t('fieldProps.category.static') },
])

const groupedElements = computed(() => {
  const groups: Record<ElementCategory, FormKitSchemaFormKit[]> = {
    field: [],
    container: [],
    layout: [],
    static: [],
  }

  filteredFormElements.value.forEach((item) => {
    const typeName =
      getElementTypeBySchema(item) ?? String((item as any).$formkit ?? (item as any).$cmp ?? '')
    const prop = fieldProps.value.find((p) => p.name === typeName)
    const category = (prop?.category || 'field') as ElementCategory
    if (groups[category]) {
      groups[category].push(item)
    }
  })

  return groups
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <n-scrollbar
      v-if="collapsed"
      class="h-full w-full"
      :x-scrollable="false"
      content-class="py-2 pr-4 pl-2"
    >
      <DraggableList :elements="filteredFormElements" />
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
          <n-input :placeholder="t('sidebar.search')" v-model:value="searchInput" />
        </div>
        <n-tabs
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
            <n-scrollbar class="h-full sidebar-scrollbar" content-class="pb-4 pr-4 pl-2">
              <DraggableList :elements="groupedElements[category.id]" />
            </n-scrollbar>
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane :key="'structure'" name="structure" :tab="t('sidebar.structure')">
        <div v-if="(formDefinition.root.children ?? []).length" class="h-full">
          <n-scrollbar class="h-full sidebar-scrollbar" content-class="p-2 pr-4 pl-2">
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
