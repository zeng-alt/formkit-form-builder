import { ref } from 'vue'

// 画布视口（桌面/平板/手机）
export type CanvasView = 'desktop' | 'tablet' | 'mobile'
export const canvasView = ref<CanvasView>('desktop')

// AI 生成表单等异步操作时的加载态
export const isLoading = ref(false)
