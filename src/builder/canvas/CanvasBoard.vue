<script setup lang="ts">
import { NCard, NSpin } from 'naive-ui'
import type { Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import ContainerChildrenGrid from '@/components/ui/containers/shared/ContainerChildrenGrid.vue'
import { selectedKey } from '@/state/form-schema'
import { formDefinition } from '@/state/form-definition'
import { canvasView, isLoading } from '@/state/canvas-ui'
import { cn } from '@/utils/utils'
import { useFormBuilderI18n } from '@/i18n/context'

const { t } = useFormBuilderI18n()

defineProps<{
  containerRef: Ref<unknown>
  items: Ref<FormKitSchemaFormKit[]>
  ulClass: string
  canvasFormClass: string
  onSelect: (child: FormKitSchemaFormKit, index: number) => void
  onSelectBlank: () => void
  onDelete: (index: number) => void
  onResizeEnd: () => void
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
          canvasView === 'desktop' ? 'w-full lg:w-[80%]' : '',
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
        :data-attrs="{ 'data-testid': 'drop-area' }"
        :ul-class="`${ulClass} min-h-full`"
        :on-select="onSelect"
        :on-select-blank="onSelectBlank"
        :on-delete="onDelete"
        :on-resize-end="onResizeEnd"
      />
    </n-card>
  </div>
</template>
