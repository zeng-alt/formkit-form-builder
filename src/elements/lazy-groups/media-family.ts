// ═══ 按需加载分组：文件/颜色/头像/图片 ══════════════════════════════════════════════
// 上传、取色、头像、图片——都偏"媒体/展示"类输入，合并成一个 chunk（见
// component-loader.ts 顶部说明的分组取舍）。
export { default as NaiveUpload } from '@/components/ui/fields/NaiveUpload.vue'
export { default as NaiveColorPicker } from '@/components/ui/fields/NaiveColorPicker.vue'
export { default as NaiveAvatar } from '@/components/ui/fields/NaiveAvatar.vue'
export { default as NaiveImage } from '@/components/ui/fields/NaiveImage.vue'
