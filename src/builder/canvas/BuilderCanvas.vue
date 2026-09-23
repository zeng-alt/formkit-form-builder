<script setup lang="ts">
import { useCanvasSchema } from '@/builder/composables/use-canvas-schema'
import { useKeyboardShortcuts } from '@/builder/composables/use-keyboard-shortcuts'
import { useFormBuilderState } from '@/state/create-form-builder-state'
import CanvasViewportControls from './CanvasViewportControls.vue'
import CanvasBoard from './CanvasBoard.vue'
import CanvasActionsBar from './CanvasActionsBar.vue'

const canvas = useCanvasSchema()
// H5：这里是 BuilderThemeScope 的子孙，useNotification()（H7 的撤销提示）才找得到
// provider——真正的快捷键处理逻辑在这里构建，注册进 BuilderMain.vue provide 的槽位
// （见 use-keyboard-shortcuts.ts 顶部注释）。
useKeyboardShortcuts(useFormBuilderState())

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

    <!-- 外层随画布行拉伸到整行高度，内层才能 sticky 贴顶：sticky 元素不能超出父元素，
         父元素只有按钮组那么高时它会跟着内容滚走，滚到顶栏下面与撤销/重做重叠 -->
    <div class="shrink-0">
      <div class="sticky top-20 flex flex-col gap-16px">
        <CanvasActionsBar />
        <slot name="toolbar" />
      </div>
    </div>
  </div>
</template>
