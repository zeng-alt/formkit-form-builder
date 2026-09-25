// ═══ 按需加载分组：评分/滑块/二维码/进度条/提示/返回顶部 ═══════════════════════════
// 剩下这几个体积都不大、使用场景也零散，单独拆分意义不大，合并成一个 chunk（见
// component-loader.ts 顶部说明的分组取舍）。
export { default as NaiveRate } from '@/components/ui/fields/NaiveRate.vue'
export { default as NaiveSlider } from '@/components/ui/fields/NaiveSlider.vue'
export { default as NaiveQrCode } from '@/components/ui/structure/NaiveQrCode.vue'
export { default as NaiveProgress } from '@/components/ui/structure/NaiveProgress.vue'
export { default as NaiveAlert } from '@/components/ui/structure/NaiveAlert.vue'
export { default as NaiveBackTop } from '@/components/ui/structure/NaiveBackTop.vue'
