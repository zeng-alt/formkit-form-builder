import { ref } from 'vue'
import type { Ref } from 'vue'

// 画布视口（桌面/平板/手机）
export type CanvasView = 'desktop' | 'tablet' | 'mobile'

export interface CanvasUiState {
  canvasView: Ref<CanvasView>
  isLoading: Ref<boolean>
}

// 按实例创建画布 UI 状态。
export function createCanvasUiState(): CanvasUiState {
  const canvasView = ref<CanvasView>('desktop')
  // AI 生成表单等异步操作时的加载态
  const isLoading = ref(false)
  return { canvasView, isLoading }
}

// 模块级默认实例（向后兼容）。
export const defaultCanvasUiState = createCanvasUiState();
export const { canvasView, isLoading } = defaultCanvasUiState;
