// 画布 / 容器拖拽反馈的共享样式类：根画布与嵌套容器共用，保证一致的拖拽体验。
// 拖拽中的被拖元素呈现「提起」的幽灵感：半透明 + 微缩放 + 紫色光晕阴影 + ring。
export const CANVAS_DRAGGING_CLASS =
  'opacity-40 scale-[0.98] shadow-[0_8px_20px_rgba(79,110,247,0.18)] ring-1 ring-[#a277ff]/40'

// 空容器被拖拽悬停时的高亮（dropZoneClass 仅对空容器生效，非空容器用插入提示线）
export const CANVAS_DROP_ZONE_CLASS = 'ring-1 ring-[#a277ff]/40 bg-[rgba(162,119,255,0.04)]'
