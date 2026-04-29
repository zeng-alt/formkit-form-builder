<script setup lang="ts">
import type { DslNode } from '@/dsl/types'
import { dslToFormKitSchema } from '@/dsl/compiler'
import { computed, ref, watch } from 'vue'
import { FormKitSchema } from '@formkit/vue'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import { NButton, NButtonGroup, NCard, NEmpty, NSpin, NTooltip } from 'naive-ui'
import { useFormBuilderI18n } from '@/i18n/context'
import { useRuntimeLocale } from '@/i18n/runtime-locale'
import { canvasView, isLoading } from '@/composables/form-fields'
import { commitSchema } from '@/composables/schema-history'
import { formDsl, selectedId, selectedTarget } from '@/utils/default-form-elements'
import { generateKey } from '@/utils/dnd/schema'
import { cn } from '@/utils/utils'
import ImportExportModal from './ImportExportModal.vue'
import type { PaletteItem } from '@/utils/palette-elements'

const { t } = useFormBuilderI18n()
const { setLocale, locale } = useRuntimeLocale()
const isZh = computed(() => locale.value === 'zh-CN')

const showImportExportModal = ref(false)

const safeClone = <T,>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const collectFields = (nodes: DslNode[], out: Set<string>) => {
  for (const n of nodes) {
    if (n.field) out.add(n.field)
    if (Array.isArray(n.children)) collectFields(n.children, out)
  }
}

const ensureUniqueField = (base: string, existing: Set<string>) => {
  const safe = base.trim() || 'field'
  if (!existing.has(safe)) return safe
  let i = 1
  while (existing.has(`${safe}_${i}`)) i++
  return `${safe}_${i}`
}

const withFreshIdentity = (node: DslNode, existingFields: Set<string>): DslNode => {
  const cloned = safeClone(node)
  const nextId = generateKey()
  const baseField = cloned.field || cloned.type || 'field'
  const nextField = ensureUniqueField(baseField, existingFields)
  existingFields.add(nextField)
  const next: DslNode = { ...cloned, id: nextId, field: nextField }
  if (Array.isArray(cloned.children) && cloned.children.length) {
    next.children = cloned.children.map((c) => withFreshIdentity(c, existingFields))
  }
  return next
}

type DynamicValuesData = { draggedNodes: Array<{ data: { value: DslNode | PaletteItem } }> }

const [containerRef, items] = useDragAndDrop<DslNode>(formDsl.value.nodes, {
  group: 'form-builder',
  nativeDrag: true,
  sortable: true,
  accepts: () => true,
  draggable: () => true,
  handleNodePointerup(data: any) {
    data.targetData.node.el.setAttribute('draggable', 'true')
  },
  insertConfig: {
    dynamicValues: (data: DynamicValuesData) => {
      const existingFields = new Set<string>()
      collectFields(formDsl.value.nodes, existingFields)
      return data.draggedNodes.map((n) => {
        const raw = (n.data.value as any)?.node ? (n.data.value as PaletteItem).node : (n.data.value as DslNode)
        return withFreshIdentity(raw, existingFields)
      })
    },
  },
  onDragend() {
    commitSchema({ ...formDsl.value, nodes: safeClone(items.value) }, { reason: 'dnd' })
  },
} as any)

watch(
  () => formDsl.value.nodes,
  (next) => {
    if (next !== items.value) items.value = safeClone(next)
  },
  { deep: true },
)

const compiledSchema = computed(() => dslToFormKitSchema(items.value as any, {}))

const canvasFormClass = computed(() => {
  const common = ['[&_.formkit-label]:text-xs', '[&_.formkit-label]:font-bold'].join(' ')
  if (formDsl.value.meta.labelPosition !== 'left') return common
  return [
    common,
    'fk-label-left',
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

const onSelectBlank = () => {
  selectedTarget.value = 'form'
  selectedId.value = null
}

const onSelectItem = (n: DslNode) => {
  selectedTarget.value = 'node'
  selectedId.value = n.id
}

const deleteField = (index: number) => {
  const next = items.value.filter((_, i) => i !== index)
  items.value = next
  commitSchema({ ...formDsl.value, nodes: safeClone(next) }, { reason: 'delete' })
  if (selectedId.value && !next.some((n) => n.id === selectedId.value)) {
    selectedId.value = null
    selectedTarget.value = 'form'
  }
}

const cardStyle = computed(() => ({ '--fk-label-width': `${formDsl.value.meta.labelWidth}px` }))
const schemaLibrary = {}
</script>

<template>
  <div class="flex flex-1 h-full min-h-0 flex-row justify-start pb-15 pt-10">
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

    <div class="flex-1 flex justify-center px-4 relative">
      <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center z-50">
        <div class="flex flex-col items-center bg-white dark:bg-neutral-600 justify-center gap-3 p-4 rounded-lg shadow-md">
          <span class="font-medium text-sm text-zinc-700 dark:text-zinc-300">{{ t('builder.creatingForm') }}</span>
          <n-spin size="medium" />
        </div>
      </div>

      <n-card
        :style="cardStyle"
        :class="cn(
          'relative min-h-[80%] !h-fit rounded-xl shadow-md transition-[width] duration-300 flex flex-col',
          canvasFormClass,
          canvasView === 'desktop' ? 'w-full lg:w-[80%]' : '',
          canvasView === 'tablet' ? 'w-[768px]' : '',
          canvasView === 'mobile' ? 'w-[375px]' : ''
        )"
        content-style="padding: 16px; flex: 1; display: flex; flex-direction: column;"
        @pointerdown.self="onSelectBlank"
      >
        <ul
          ref="containerRef"
          class="w-full grid grid-cols-12 gap-x-4 gap-y-2 list-none p-0 m-0 flex-1"
          data-testid="drop-area"
          @pointerdown.self="onSelectBlank"
        >
          <li v-if="items.length === 0" class="col-span-12 min-h-[140px] flex items-center justify-center pointer-events-none">
            <n-empty :description="t('builder.listDropHere')" />
          </li>
          <li
            v-for="(node, idx) in items"
            :key="node.id"
            data-canvas-item="true"
            :class="[
              'group rounded-xl transition-[border-color,background-color,box-shadow] duration-150',
              'px-2 py-1 pr-4 !cursor-grab h-full !z-20 relative border-[1.5px] min-w-0 box-border',
              node.id === selectedId
                ? 'border-solid border-[#a277ff] bg-[#a277ff]/[0.05] shadow-[0_0_0_3px_rgba(79,110,247,0.12)] dark:bg-[#a277ff]/[0.08]'
                : 'border-dashed border-transparent hover:border-[#7c9ef8] hover:bg-[#f0f4ff] dark:hover:bg-[rgba(100,130,255,0.07)]',
            ]"
            :style="{
              gridColumn: `span ${Math.max(1, Math.min(12, Number(node.layout?.span ?? 12)))} / span ${Math.max(1, Math.min(12, Number(node.layout?.span ?? 12)))}`
            }"
            tabindex="0"
            @pointerdown.stop="onSelectItem(node)"
          >
            <div class="flex gap-1.5 p-1 w-full pb-2">
              <div class="flex-1 w-full min-w-0">
                <FormKitSchema
                  :schema="compiledSchema[idx] ? [compiledSchema[idx]!] : []"
                  :library="schemaLibrary"
                  :key="`dsl-node-${node.id}`"
                />
              </div>
            </div>

            <div class="absolute bottom-2 right-2 flex flex-row z-40">
              <n-button
                quaternary
                size="small"
                :aria-label="t('builder.deleteField')"
                draggable="false"
                @pointerdown.stop.prevent
                @click.stop="deleteField(idx)"
                class="!h-[26px] !w-[26px] !rounded-[7px] !text-muted-foreground
                      hover:!bg-red-100 hover:!text-red-600
                      active:!scale-95 active:!bg-red-200 active:!text-red-700
                      dark:hover:!bg-red-950/50 dark:hover:!text-red-400
                      transition-all duration-150"
              >
                <template #icon><span class="i-lucide-trash-2 !h-[13px] !w-[13px]"></span></template>
              </n-button>
            </div>
          </li>
        </ul>
      </n-card>
    </div>

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
