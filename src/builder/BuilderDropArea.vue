<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NButtonGroup, NSpin, NCard, NTooltip } from 'naive-ui'
import { customInsertPlugin } from '../utils/custom-insert-plugin'
import { formMeta, formSchema, selectedIndex, selectedKey, selectedTarget } from '../utils/default-form-elements'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { isLoading, canvasView } from '../composables/form-fields'
import { cn } from '../utils/utils'
import { commitSchema } from '../composables/schema-history'
import ImportExportModal from './ImportExportModal.vue'
import { canvasSchemaLibrary } from './containers'
import { createDefaultInsertPointElement } from '../utils/dnd/insert-point-element'
import { collectSchemaNames, ensureUniqueName, generateKey, toSafeName } from '../utils/dnd/schema'
import { findSchemaNodeByKey } from '../composables/form-fields'
import { useFormBuilderI18n } from '@/i18n/context'
import { useRuntimeLocale } from '@/i18n/runtime-locale'
import { toCanvasSchemaNode } from '../utils/canvas-schema'
import { provideCanvasSchemaContext } from './composables/canvas-schema-context'
import { normalizeContainerNode } from '@/containers/registry'
import ContainerChildrenGrid from '@/components/ui/containers/shared/ContainerChildrenGrid.vue'

const showImportExportModal = ref(false)
const { setLocale, locale } = useRuntimeLocale()

const { t } = useFormBuilderI18n()

const isZh = computed(() => locale.value === 'zh-CN')

const canvasFormClass = computed(() => {
  const common = [
    '[&_.formkit-label]:text-xs',
    '[&_.formkit-label]:font-bold',
  ].join(' ')
  if (formMeta.value.labelPosition !== 'left') return common
  return [
    common,
    '[&_.formkit-wrapper]:flex',
    '[&_.formkit-wrapper]:flex-row',
    '[&_.formkit-wrapper]:items-start',
    '[&_.formkit-wrapper]:gap-3',
    '[&_.formkit-label]:mb-0',
    '[&_.formkit-label]:w-[var(--fk-label-width)]',
    '[&_.formkit-label]:shrink-0',
    '[&_.formkit-label]:pt-1',
    '[&_.formkit-inner]:flex-1',
    '[&_.formkit-inner]:min-w-0',
  ].join(' ')
})
const deleteField = (index: number) => {
  const nextSchema = formSchema.value.filter((_: unknown, i: number) => i !== index)
  commitSchema(nextSchema as FormKitSchemaFormKit[], { reason: 'delete' })
  fields.value = fields.value.filter((_, i) => i !== index)
}

const updateContainerChildren = (containerKey: string, children: FormKitSchemaFormKit[]) => {
  const currentFound = findSchemaNodeByKey(formSchema.value as any[], containerKey)
  if (!currentFound) return
  const existingNames = new Set<string>()
  collectSchemaNames(formSchema.value as any, existingNames)
  const ensureIdentity = (node: any): any => {
    if (!node || typeof node !== 'object') return node
    if (node.$formkit === 'submit' && Array.isArray(node.children)) {
      delete node.children
    }
    if (typeof node.__key === 'string' && node.__key) {
      if (Array.isArray(node.children)) node.children = node.children.map((c: any) => ensureIdentity(c))
      return node
    }
    const nextKey = generateKey()
    const base = toSafeName(node.$formkit || node.name || 'field')
    const nextName = node.$formkit === 'submit' ? node.name : ensureUniqueName(base, existingNames)
    const next: any =
      node.$formkit === 'submit'
        ? { ...node, __key: nextKey, outerClass: node.outerClass || 'col-span-12 pt-2' }
        : { ...node, __key: nextKey, name: nextName, id: `field_${nextKey}`, outerClass: node.outerClass || 'col-span-12' }
    if (Array.isArray(node.children)) next.children = node.children.map((c: any) => ensureIdentity(c))
    return next
  }
  const normalizedChildren = children.map((c: any) => ensureIdentity({ ...c }))

  const childKeys = new Set<string>()
  const collectKeys = (nodes: any[]) => {
    for (const n of nodes) {
      const k = n?.__key
      if (typeof k === 'string' && k) childKeys.add(k)
      const c = n?.children
      if (Array.isArray(c)) collectKeys(c)
    }
  }
  collectKeys(normalizedChildren as any[])

  const prune = (nodes: any[]): any[] => {
    return nodes
      .filter((node) => {
        const k = node?.__key
        if (typeof k === 'string' && k) {
          if (k === containerKey) return true
          if (childKeys.has(k)) return false
        }
        return true
      })
      .map((node) => {
        if (!node || typeof node !== 'object') return node
        const c = (node as any).children
        if (!Array.isArray(c)) return node
        const nextChildren = prune(c)
        return { ...(node as any), children: nextChildren }
      })
  }
  const normalizePath = (path: number[]) => path.filter((p) => p !== -1)
  const updateAtPath = (schema: any[], path: number[], nextNode: any): any[] => {
    const p = normalizePath(path)
    if (p.length === 0) return schema
    const nextSchema = [...schema]
    const idx0 = p[0]!
    if (p.length === 1) {
      nextSchema[idx0] = nextNode
      return nextSchema
    }
    const parent = { ...(nextSchema[idx0] as any) }
    let cursor: any = parent
    for (let i = 1; i < p.length - 1; i++) {
      const idx = p[i]!
      const arr = Array.isArray(cursor.children) ? [...cursor.children] : []
      const child = { ...(arr[idx] as any) }
      arr[idx] = child
      cursor.children = arr
      cursor = child
    }
    const lastIdx = p[p.length - 1]!
    const lastArr = Array.isArray(cursor.children) ? [...cursor.children] : []
    lastArr[lastIdx] = nextNode
    cursor.children = lastArr
    nextSchema[idx0] = parent
    return nextSchema
  }

  const prunedSchema = prune(formSchema.value as any[]) as FormKitSchemaFormKit[]
  const found = findSchemaNodeByKey(prunedSchema as any[], containerKey)
  if (!found) return
  const merged: any = { ...(found.node as any), children: normalizedChildren }
  if (merged.$cmp) {
    merged.props = { ...merged.props }
    if (merged.props && typeof merged.props === 'object') delete merged.props.modelValue
  }
  const nextSchema = updateAtPath(prunedSchema as any[], found.path, merged) as FormKitSchemaFormKit[]
  commitSchema(nextSchema as FormKitSchemaFormKit[], { reason: 'container-children', merge: true })
}


const selectByKey = (key: string) => {
  const found = findSchemaNodeByKey(formSchema.value as any[], key)
  if (!found) return
  selectedTarget.value = 'field'
  selectedIndex.value = found.rootIndex
  selectedKey.value = key
}

const [formFields, fields] = useDragAndDrop<FormKitSchemaFormKit>(formSchema.value, {
  group: 'form-builder',
  nativeDrag: true,
  draggingClass: 'opacity-5 bg-green-400/50',
  accepts: () => true,
  sortable: true,
  draggable: () => true,
  handleNodePointerup(data) {
    data.targetData.node.el.setAttribute('draggable', 'true')
  },
  plugins: [
    customInsertPlugin({
      insertPoint: () => {
        return createDefaultInsertPointElement()
      },
    }),
  ],
})

const rootGrid = { containerRef: formFields, items: fields }

watch(
  () => formSchema.value,
  (nextSchema) => {
    if (nextSchema !== fields.value) {
      fields.value = [...nextSchema]
    }
  },
)

const dropAreaUlClass = computed(() =>
  cn(
    'w-full grid grid-cols-12 gap-x-4 gap-y-2 list-none p-0 m-0 flex-1',
    fields.value.length === 0 ? 'min-h-[200px] h-full' : 'h-fit',
  ),
)

const onSelectRoot = (child: FormKitSchemaFormKit, index: number) => {
  const key = (child as any)?.__key as string | undefined
  selectedTarget.value = 'field'
  if (key) selectByKey(key)
  else selectedIndex.value = index
}

const onSelectBlank = () => {
  selectedTarget.value = 'form'
  selectedKey.value = null
}

const onResizeEnd = () => {
  commitSchema(fields.value as FormKitSchemaFormKit[], { reason: 'resize', merge: true })
}

const schemaLibrary = canvasSchemaLibrary

const renderCanvasSchemaNode = (field: any): any => {
  if (!field || typeof field !== 'object') return field
  const next = normalizeContainerNode(field)
  return toCanvasSchemaNode(next as FormKitSchemaFormKit)
}

provideCanvasSchemaContext({
  library: schemaLibrary,
  renderNode: renderCanvasSchemaNode,
  updateContainerChildren,
  selectByKey,
})
</script>

<template>
  <div class="flex flex-1 h-full min-h-0 flex-row justify-start pb-15 pt-10">

    <!-- Left side controls -->
    <div class="w-16 shrink-0 flex flex-col items-center">
      <n-button-group vertical class="sticky top-20 bg-card shadow-sm rounded-lg border border-border/50">
        <n-tooltip placement="right">
          <template #trigger>
            <n-button
              :type="canvasView === 'desktop' ? 'primary' : 'default'"
              :aria-label="t('builder.desktopView')"
              @click="canvasView = 'desktop'"
              size="small"
              class="w-8 h-8"
            >
              <template #icon><span class="i-lucide-monitor h-3.5 w-3.5"></span></template>
            </n-button>
          </template>
          {{ t('builder.desktopView') }}
        </n-tooltip>
        <n-tooltip placement="right">
          <template #trigger>
            <n-button
              :type="canvasView === 'tablet' ? 'primary' : 'default'"
              :aria-label="t('builder.tabletView')"
              @click="canvasView = 'tablet'"
              size="small"
              class="w-8 h-8"
            >
              <template #icon><span class="i-lucide-tablet h-3.5 w-3.5"></span></template>
            </n-button>
          </template>
          {{ t('builder.tabletView') }}
        </n-tooltip>
        <n-tooltip placement="right">
          <template #trigger>
            <n-button
              :type="canvasView === 'mobile' ? 'primary' : 'default'"
              :aria-label="t('builder.mobileView')"
              @click="canvasView = 'mobile'"
              size="small"
              class="w-8 h-8"
            >
              <template #icon><span class="i-lucide-smartphone h-3.5 w-3.5"></span></template>
            </n-button>
          </template>
          {{ t('builder.mobileView') }}
        </n-tooltip>
      </n-button-group>
    </div>

    <!-- Center Canvas Area -->
    <div class="flex-1 flex justify-center px-4 relative">
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center z-50">
        <div class="flex flex-col items-center bg-white dark:bg-neutral-600 justify-center gap-3 p-4 rounded-lg shadow-md">
          <span class="font-medium text-sm text-zinc-700 dark:text-zinc-300">{{ t('builder.creatingForm') }}</span>
          <n-spin size="medium" />
        </div>
      </div>

      <n-card
        :style="{ '--fk-label-width': `${formMeta.labelWidth}px` }"
        :class="cn(
          'relative min-h-[80%] !h-fit rounded-xl shadow-md transition-[width] duration-300 flex flex-col',
          canvasFormClass,
          canvasView === 'desktop' ? 'w-full lg:w-[80%]' : '',
          canvasView === 'tablet' ? 'w-[768px]' : '',
          canvasView === 'mobile' ? 'w-[375px]' : ''
        )"
        content-style="padding: 16px; flex: 1; display: flex; flex-direction: column;"
      >
        <ContainerChildrenGrid
          :container-ref="rootGrid.containerRef"
          :items="rootGrid.items"
          :selected-key="selectedKey"
          :empty-text="t('builder.listDropHere')"
          :delete-aria-label="t('builder.deleteField')"
          :data-attrs="{ 'data-testid': 'drop-area' }"
          :ul-class="`${dropAreaUlClass} min-h-full`"
          :on-select="onSelectRoot"
          :on-select-blank="onSelectBlank"
          :on-delete="deleteField"
          :on-resize-end="onResizeEnd"
        />
      </n-card>
    </div>

    <!-- Right side controls -->
    <div class="w-16 shrink-0 hidden md:flex flex-col items-center">
      <div class="sticky top-20 flex flex-col gap-2">
        <n-button-group vertical class="bg-card shadow-sm rounded-lg border border-border/50">
          <n-tooltip placement="left">
            <template #trigger>
              <n-button
                @click="showImportExportModal = true"
                size="small"
                :aria-label="t('builder.importExportSchema')"
                class="w-8 h-8"
              >
                <template #icon><span class="i-lucide-code-xml h-3.5 w-3.5"></span></template>
              </n-button>
            </template>
            {{ t('builder.importExportSchema') }}
          </n-tooltip>
        </n-button-group>

        <n-button-group vertical class="bg-card shadow-sm rounded-lg border border-border/50">
          <n-button
            size="small"
            class="w-8 h-8"
            :type="isZh ? 'primary' : 'default'"
            aria-label="切换到中文"
            @click="setLocale('zh-CN')"
          >
            中
          </n-button>
          <n-button
            size="small"
            class="w-8 h-8"
            :type="!isZh ? 'primary' : 'default'"
            aria-label="Switch to English"
            @click="setLocale('en')"
          >
            EN
          </n-button>
        </n-button-group>
      </div>
    </div>

    <ImportExportModal v-model:show="showImportExportModal" />
  </div>
</template>
