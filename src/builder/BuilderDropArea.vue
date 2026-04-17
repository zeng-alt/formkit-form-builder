<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NButtonGroup, NSpin, NCard, NTooltip } from 'naive-ui'
import { FormKitSchema } from '@formkit/vue'
import { Trash2, Monitor, Tablet, Smartphone, CodeXml, ChevronsLeftRight } from 'lucide-vue-next'
import { useFormBuilderI18n } from '../i18n/context'
import { customInsertPlugin } from '../utils/custom-insert-plugin'
import { formSchema, selectedIndex } from '../utils/default-form-elements'
import { useDragAndDrop } from '@formkit/drag-and-drop/vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { isLoading, canvasView } from '../composables/form-fields'
import { cn } from '../utils/utils'
import { useFormField } from '../composables/form-fields'
import { commitSchema } from '../composables/schema-history'
import ImportExportModal from './ImportExportModal.vue'

const { validationStringLength } = useFormField()
const { t } = useFormBuilderI18n()

const showImportExportModal = ref(false)

const deleteField = (index: number) => {
  const nextSchema = formSchema.value.filter((_: unknown, i: number) => i !== index)
  commitSchema(nextSchema as FormKitSchemaFormKit[], { reason: 'delete' })
  fields.value = fields.value.filter((_, i) => i !== index)
}

// 从 outerClass 中提取 col-span 数值，默认 12
const getColSpan = (field: unknown, index: number): number => {
  const outerClass =
    (field as FormKitSchemaFormKit)?.outerClass || formSchema.value[index]?.outerClass || ''
  const match = outerClass.match(/col-span-(\d+)/)
  return match ? parseInt(match[1], 10) : 12
}

const resizingIndex = ref<number | null>(null)
const resizingPointerId = ref<number | null>(null)
const startX = ref(0)
const startSpan = ref(12)
const columnWidth = ref(0)

// Safelist for Tailwind JIT to properly generate classes for dynamic column spans
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const safelistClasses = [
  'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4',
  'col-span-5', 'col-span-6', 'col-span-7', 'col-span-8',
  'col-span-9', 'col-span-10', 'col-span-11', 'col-span-12'
]

const startResize = (e: PointerEvent, index: number) => {
  resizingIndex.value = index
  resizingPointerId.value = e.pointerId
  startX.value = e.clientX

  const schemaItem = formSchema.value[index]
  if (!schemaItem) return

  const match = schemaItem.outerClass?.match(/col-span-(\d+)/)
  startSpan.value = match ? parseInt(match[1], 10) : 12

  if (formFields.value) {
    const ul = formFields.value as unknown as HTMLElement
    columnWidth.value = ul.clientWidth / 12
  }

  ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

const setColSpan = (index: number, newSpan: number) => {
  newSpan = Math.max(2, Math.min(12, newSpan))
  newSpan = Math.round(newSpan / 2) * 2

  const schemaItem = formSchema.value[index]
  if (schemaItem) {
    let classes = schemaItem.outerClass || ''
    if (/col-span-\d+/.test(classes)) {
      classes = classes.replace(/col-span-\d+/, `col-span-${newSpan}`)
    } else {
      classes = `${classes} col-span-${newSpan}`.trim()
    }
    schemaItem.outerClass = classes

    if (fields.value[index]) {
      fields.value[index] = {
        ...fields.value[index],
        outerClass: schemaItem.outerClass
      }
    }
  }
}

const onPointerMove = (e: PointerEvent) => {
  if (resizingPointerId.value !== null && e.pointerId !== resizingPointerId.value) return
  const index = resizingIndex.value
  if (index === null) return

  const deltaX = e.clientX - startX.value
  const deltaSpan = Math.round(deltaX / columnWidth.value)
  setColSpan(index, startSpan.value + deltaSpan)
}

const onPointerUp = (e: PointerEvent) => {
  if (resizingPointerId.value !== null && e.pointerId !== resizingPointerId.value) return
  if (resizingIndex.value !== null) {
    commitSchema(formSchema.value, { reason: 'resize' })
  }
  resizingIndex.value = null
  resizingPointerId.value = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

const nudgeResize = (index: number, deltaSpan: number) => {
  const schemaItem = formSchema.value[index]
  if (!schemaItem) return

  const match = schemaItem.outerClass?.match(/col-span-(\d+)/)
  const currentSpan = match ? parseInt(match[1], 10) : 12
  setColSpan(index, currentSpan + deltaSpan)
  commitSchema(formSchema.value, { reason: 'resize' })
}

const clickedField = (index: number) => {
  selectedIndex.value = index
}

const pluralize = (count: number, noun: string, suffix = 's') => {
  return count === 1 ? noun : noun + suffix
}

const insertPointClasses = [
  'absolute',
  'bg-green-500',
  'z-[2000]',
  'rounded-full',
  'duration-[5ms]',
  'before:block',
  'before:content-["Drop_here"]',
  'before:whitespace-nowrap',
  'before:bg-green-900',
  'before:py-1',
  'before:h-6',
  'before:px-3',
  'before:rounded-lg',
  'before:text-xs',
  'before:font-medium',
  'before:absolute',
  'before:top-1/2',
  'before:left-1/2',
  'before:-translate-y-1/2',
  'before:-translate-x-1/2',
  'before:text-white',
  'before:shadow-sm',
  'before:transition-[opacity,transform]',
  'before:border',
  'before:border-green-400/20',
]

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
        const div = document.createElement('div')
        for (const cls of insertPointClasses) div.classList.add(cls)
        return div
      },
    }),
  ],
})

watch(
  () => formSchema.value,
  (nextSchema) => {
    if (nextSchema !== fields.value) {
      fields.value = [...nextSchema]
    }
  },
)
</script>

<template>
  <div class="flex flex-1 flex-row justify-start mb-15 pt-10">

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
              <template #icon><Monitor class="h-3.5 w-3.5" /></template>
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
              <template #icon><Tablet class="h-3.5 w-3.5" /></template>
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
              <template #icon><Smartphone class="h-3.5 w-3.5" /></template>
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
        :class="cn(
          'relative min-h-[80%] !h-fit rounded-xl shadow-md transition-[width] duration-300 flex flex-col',
          canvasView === 'desktop' ? 'w-full lg:w-[80%]' : '',
          canvasView === 'tablet' ? 'w-[768px]' : '',
          canvasView === 'mobile' ? 'w-[375px]' : ''
        )"
        content-style="padding: 16px; flex: 1; display: flex; flex-direction: column;"
      >
        <!-- 保留原生 ul 以确保 useDragAndDrop ref 绑定正常工作 -->
        <ul
          ref="formFields"
          :class="cn(
            'w-full grid grid-cols-12 gap-x-4 gap-y-2 list-none p-0 m-0 flex-1',
            fields.length === 0 ? 'min-h-[200px] h-full' : 'h-fit',
          )"
          data-testid="drop-area"
        >
          <li
            v-for="(field, index) in fields"
            :key="(field as any)?.__key || (field as FormKitSchemaFormKit)?.name || (field as FormKitSchemaFormKit)?.$formkit + index"
            :class="cn(
              'group rounded-lg transition-[border-color,background-color] duration-200 p-1 !cursor-grab h-full !z-20 relative border-2 border-dashed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--n-primary-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              selectedIndex === index
                ? 'border-[color:var(--n-primary-color)] bg-ring/20 dark:bg-accent/20 duration-300'
                : 'bg-ring/5 border-transparent hover:border-[color:var(--n-primary-color-hover,var(--n-primary-color))] dark:bg-ring/3',
            )"
            :style="{
              gridColumn: `span ${getColSpan(field, index)} / span ${getColSpan(field, index)}`
            }"
            tabindex="0"
            @pointerdown.capture="clickedField(index)"
            @keydown.enter.stop.prevent="clickedField(index)"
            @keydown.space.stop.prevent="clickedField(index)"
          >
            <!-- Field content -->
            <div class="flex gap-1.5 p-1 w-full pb-2">
              <div class="flex-1 w-full">
                <FormKitSchema
                  :schema="[field as FormKitSchemaFormKit]"
                  :key="`form-item-${index}`"
                />
              </div>
            </div>

            <!-- Bottom controls: validation rules count + delete button -->
            <div class="absolute bottom-1 right-1 flex flex-row z-40">
              <div
                class="px-2 mr-1 border-1 border-ring/40 dark:border-ring/20 rounded-md flex items-center justify-center"
                v-if="selectedIndex === index"
              >
                <span class="text-xs">
                  {{ validationStringLength }} {{ pluralize(validationStringLength, 'rule') }}
                </span>
              </div>
              <n-button
                quaternary
                circle
                size="small"
                :aria-label="t('builder.deleteField')"
                @click.stop="deleteField(index)"
                class="h-7 w-7 md:h-8 md:w-8 !text-muted-foreground hover:!bg-destructive/15 hover:!text-destructive"
              >
                <template #icon><Trash2 class="!h-4 !w-4" /></template>
              </n-button>
            </div>

            <!-- Resize handle（submit 字段不允许调整宽度） -->
            <button
              class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 cursor-ew-resize flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
              type="button"
              :aria-label="t('builder.resizeFieldWidth')"
              @pointerdown.stop.prevent="startResize($event, index)"
              @keydown.left.stop.prevent="nudgeResize(index, -2)"
              @keydown.right.stop.prevent="nudgeResize(index, 2)"
            >
              <span
                :class="cn(
                  'h-2.5 w-2.5 rounded-full border-2 bg-background dark:bg-neutral-900',
                  selectedIndex === index
                    ? 'border-[color:var(--n-primary-color)]'
                    : 'border-[color:var(--n-primary-color-hover,var(--n-primary-color))]',
                )"
              />
            </button>

            <!-- 拖拽调整宽度时的遮罩，显示当前百分比 -->
            <div
              v-if="resizingIndex === index"
              class="absolute inset-0 z-40 bg-background/50 backdrop-blur-[1px] flex items-center justify-center rounded-lg border-2 border-primary/50"
            >
              <span class="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded shadow-md">
                {{ (getColSpan(field, index) / 12 * 100).toFixed(0) }}%
              </span>
            </div>
          </li>
        </ul>
      </n-card>
    </div>

    <!-- Right side controls -->
    <div class="w-16 shrink-0 hidden md:flex flex-col items-center">
      <n-button-group vertical class="sticky top-20 bg-card shadow-sm rounded-lg border border-border/50">
        <n-tooltip placement="left">
          <template #trigger>
            <n-button
              @click="showImportExportModal = true"
              size="small"
              :aria-label="t('builder.importExportSchema')"
              class="w-8 h-8"
            >
              <template #icon><CodeXml class="h-3.5 w-3.5" /></template>
            </n-button>
          </template>
          {{ t('builder.importExportSchema') }}
        </n-tooltip>
      </n-button-group>
    </div>

    <ImportExportModal v-model:show="showImportExportModal" />
  </div>
</template>
