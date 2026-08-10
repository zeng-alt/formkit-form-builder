<script setup lang="ts">
import { NCard, NSpin } from 'naive-ui'
import type { Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import ContainerChildrenGrid from '@/components/ui/containers/shared/ContainerChildrenGrid.vue'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import { cn } from '@/utils/utils'
import { useFormBuilderI18n } from '@/i18n/context'

const { t } = useFormBuilderI18n()

// 所属 FormBuilder 实例状态（多设计器并存时各自作用域）。
const state = useFormBuilderState()
const { selectedKey, formDefinition, canvasView, isLoading } = state
// 根 drop-area testid 带实例后缀：DnD 提交 / 插入定位按此找到所属画布根。
const rootDropAreaAttrs = { 'data-testid': `drop-area-${state.instanceId}` }

defineProps<{
  containerRef: Ref<unknown>
  items: Ref<FormKitSchemaFormKit[]>
  ulClass: string
  canvasFormClass: string
  onSelect: (child: FormKitSchemaFormKit, index: number) => void
  onSelectBlank: () => void
  onDelete: (index: number) => void
  onCopy: (index: number) => void
  onResizeEnd: () => void
}>()

defineSlots<{
  /** 画布空状态 */
  empty?: () => unknown
}>()
</script>

<template>
  <div class="flex-1 flex justify-center px-4 relative">
    <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center z-50">
      <div
        class="flex flex-col items-center bg-white dark:bg-neutral-600 justify-center gap-3 p-4 rounded-lg shadow-md"
      >
        <span class="font-medium text-sm text-zinc-700 dark:text-zinc-300">{{
          t('builder.creatingForm')
        }}</span>
        <n-spin size="medium" />
      </div>
    </div>

    <n-card
      :style="{ '--fk-label-width': `${formDefinition?.settings?.labelWidth ?? 80}px` }"
      :class="
        cn(
          'relative min-h-[80%] !h-fit rounded-xl shadow-md transition-[width] duration-300 flex flex-col',
          canvasFormClass,
          canvasView === 'desktop' ? 'w-full lg:w-[94%]' : '',
          canvasView === 'tablet' ? 'w-[768px]' : '',
          canvasView === 'mobile' ? 'w-[375px]' : '',
        )
      "
      content-style="padding: 16px; flex: 1; display: flex; flex-direction: column;"
    >
      <ContainerChildrenGrid
        :container-ref="containerRef"
        :items="items"
        :selected-key="selectedKey"
        :empty-text="t('builder.listDropHere')"
        :delete-aria-label="t('builder.deleteField')"
        :copy-aria-label="t('builder.duplicateField')"
        :data-attrs="rootDropAreaAttrs"
        :ul-class="ulClass"
        :empty-min-height="'400px'"
        :on-select="onSelect"
        :on-select-blank="onSelectBlank"
        :on-delete="onDelete"
        :on-copy="onCopy"
        :on-resize-end="onResizeEnd"
      >
        <template v-if="$slots['empty']" #empty>
          <slot name="empty" />
        </template>
      </ContainerChildrenGrid>
    </n-card>
  </div>
</template>
