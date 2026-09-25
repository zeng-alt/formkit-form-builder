// ═══ 按需加载分组：从一组值里选 ═══════════════════════════════════════════════════
// 级联/树选择/穿梭框/提及/自动完成——都是"从一组候选值里选"这类交互，体积中等、
// 单独拆成 5 个 chunk 请求数偏多，合并成一个 chunk（见 component-loader.ts 顶部说明）。
export { default as NaiveCascader } from '@/components/ui/fields/NaiveCascader.vue'
export { default as NaiveTreeSelect } from '@/components/ui/fields/NaiveTreeSelect.vue'
export { default as NaiveTransfer } from '@/components/ui/fields/NaiveTransfer.vue'
export { default as NaiveMention } from '@/components/ui/fields/NaiveMention.vue'
export { default as NaiveAutoComplete } from '@/components/ui/fields/NaiveAutoComplete.vue'
