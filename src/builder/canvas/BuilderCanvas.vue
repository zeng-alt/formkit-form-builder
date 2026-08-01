<script setup lang="ts">
import { useCanvasSchema } from '@/builder/composables/use-canvas-schema'
import CanvasViewportControls from './CanvasViewportControls.vue'
import CanvasBoard from './CanvasBoard.vue'
import CanvasActionsBar from './CanvasActionsBar.vue'

const canvas = useCanvasSchema()
</script>

<template>
  <div class="flex flex-1 h-full min-h-0 flex-row justify-start pb-15 pt-10">
    <CanvasViewportControls />

    <CanvasBoard
      :container-ref="canvas.rootGrid.containerRef"
      :items="canvas.rootGrid.items"
      :ul-class="canvas.dropAreaUlClass.value"
      :canvas-form-class="canvas.canvasFormClass.value"
      :on-select="canvas.onSelectRoot"
      :on-select-blank="canvas.onSelectBlank"
      :on-delete="canvas.onDelete"
      :on-resize-end="canvas.onResizeEnd"
    />

    <CanvasActionsBar />
  </div>
</template>
