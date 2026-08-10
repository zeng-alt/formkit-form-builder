<script setup lang="ts">
import { useCanvasSchema } from '@/builder/composables/use-canvas-schema'
import CanvasViewportControls from './CanvasViewportControls.vue'
import CanvasBoard from './CanvasBoard.vue'
import CanvasActionsBar from './CanvasActionsBar.vue'

const canvas = useCanvasSchema()

defineSlots<{
  /** 右侧操作列（导入导出 / 语言切换） */
  toolbar?: () => unknown
  /** 画布空状态 */
  empty?: () => unknown
}>()
</script>

<template>
  <div class="flex flex-1 h-full min-h-0 flex-row justify-start pb-60px pt-40px">
    <CanvasViewportControls />

    <CanvasBoard
      :container-ref="canvas.rootGrid.containerRef"
      :items="canvas.rootGrid.items"
      :ul-class="canvas.dropAreaUlClass.value"
      :canvas-form-class="canvas.canvasFormClass.value"
      :on-select="canvas.onSelectRoot"
      :on-select-blank="canvas.onSelectBlank"
      :on-delete="canvas.onDelete"
      :on-copy="canvas.onDuplicate"
      :on-resize-end="canvas.onResizeEnd"
    >
      <template v-if="$slots['empty']" #empty>
        <slot name="empty" />
      </template>
    </CanvasBoard>

    <div class="flex flex-col gap-16px">
      <CanvasActionsBar />
      <slot name="toolbar" />
    </div>
  </div>
</template>
