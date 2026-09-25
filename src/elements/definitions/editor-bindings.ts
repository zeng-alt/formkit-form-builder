// ═══ 设计器专属：右侧属性面板的编辑器组件绑定 ══════════════════════════════════════
// elements/definitions/{fields,containers,static}.ts 是纯数据目录，渲染入口
// （renderer-entry.ts）也要用它们的 template/toSchema 注册元素类型——如果像过去那样
// 把 editor: () => import(...) 直接写进这些数据对象，即使从不调用，Rollup 仍会把这些
// 动态 import 当成该模块的依赖来追踪：ES 产物里它们至少会被分析成惰性 chunk（不进首屏，
// 问题不大），但 UMD 单文件产物会把可达的动态 import 全部强制内联（build.rollupOptions
// .output.codeSplitting: false），导致只 require renderer 入口的使用方也被迫连带装进
// 右侧编辑器 UI 和它们依赖的 CodeMirror。
//
// 所以把"编辑器组件"这一份按 type 索引的映射整个拆到这个文件，只由设计器侧
// （builder/containers/index.ts）静态引入，通过 dsl/registry.ts 的
// setElementEditors() 在已注册的元素定义上按 type 补一个 .editor 字段；
// 渲染入口不引入这个文件，这些编辑器组件（及 CodeMirror）就不会出现在它的产物里。
import { setElementEditors } from '@/dsl/registry'

setElementEditors({
  text: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  textarea: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  email: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  url: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  tel: () => import('@/components/sidebar-right/edits/editors/TextLikeEditor.vue'),
  password: () => import('@/components/sidebar-right/edits/editors/PasswordEditor.vue'),
  number: () => import('@/components/sidebar-right/edits/editors/NumberEditor.vue'),
  range: () => import('@/components/sidebar-right/edits/editors/RangeEditor.vue'),
  date: () => import('@/components/sidebar-right/edits/editors/DateLikeEditor.vue'),
  time: () => import('@/components/sidebar-right/edits/editors/DateLikeEditor.vue'),
  naiveDateTime: () => import('@/components/sidebar-right/edits/editors/DateTimeEditor.vue'),
  select: () => import('@/components/sidebar-right/edits/editors/SelectEditor.vue'),
  radio: () => import('@/components/sidebar-right/edits/editors/RadioEditor.vue'),
  checkbox: () => import('@/components/sidebar-right/edits/editors/CheckboxEditor.vue'),
  naiveCascader: () => import('@/components/sidebar-right/edits/editors/NaiveCascaderEditor.vue'),
  naiveTreeSelect: () =>
    import('@/components/sidebar-right/edits/editors/NaiveTreeSelectEditor.vue'),
  naiveTransfer: () => import('@/components/sidebar-right/edits/editors/NaiveTransferEditor.vue'),
  naiveMention: () => import('@/components/sidebar-right/edits/editors/NaiveMentionEditor.vue'),
  naiveAutoComplete: () =>
    import('@/components/sidebar-right/edits/editors/NaiveAutoCompleteEditor.vue'),
  naiveSwitch: () => import('@/components/sidebar-right/edits/editors/NaiveSwitchEditor.vue'),
  naiveRate: () => import('@/components/sidebar-right/edits/editors/NaiveRateEditor.vue'),
  file: () => import('@/components/sidebar-right/edits/editors/FileEditor.vue'),
  naiveImage: () => import('@/components/sidebar-right/edits/editors/NaiveImageEditor.vue'),
  naiveAvatar: () => import('@/components/sidebar-right/edits/editors/NaiveAvatarEditor.vue'),
  color: () => import('@/components/sidebar-right/edits/editors/ColorEditor.vue'),
  richText: () => import('@/components/sidebar-right/edits/editors/RichTextEditor.vue'),
  signature: () => import('@/components/sidebar-right/edits/editors/SignatureEditor.vue'),
  group: () => import('@/components/sidebar-right/edits/editors/GroupEditor.vue'),
  list: () => import('@/components/sidebar-right/edits/editors/ListEditor.vue'),
  inputGroup: () => import('@/components/sidebar-right/edits/editors/InputGroupEditor.vue'),
  buttonGroup: () => import('@/components/sidebar-right/edits/editors/ButtonGroupEditor.vue'),
  card: () => import('@/components/sidebar-right/edits/editors/CardEditor.vue'),
  badge: () => import('@/components/sidebar-right/edits/editors/BadgeEditor.vue'),
  tabs: () => import('@/components/sidebar-right/edits/editors/TabsEditor.vue'),
  steps: () => import('@/components/sidebar-right/edits/editors/StepsEditor.vue'),
  dataTable: () => import('@/components/sidebar-right/edits/editors/DataTableEditor.vue'),
  collapse: () => import('@/components/sidebar-right/edits/editors/CollapseEditor.vue'),
  submit: () => import('@/components/sidebar-right/edits/editors/SubmitEditor.vue'),
  reset: () => import('@/components/sidebar-right/edits/editors/SubmitEditor.vue'),
  naiveButton: () => import('@/components/sidebar-right/edits/editors/NaiveButtonEditor.vue'),
  naiveText: () => import('@/components/sidebar-right/edits/editors/NaiveTextEditor.vue'),
  naiveP: () => import('@/components/sidebar-right/edits/editors/NaiveParagraphEditor.vue'),
  naiveA: () => import('@/components/sidebar-right/edits/editors/NaiveLinkEditor.vue'),
  naiveBlockquote: () =>
    import('@/components/sidebar-right/edits/editors/NaiveBlockquoteEditor.vue'),
  naiveUl: () => import('@/components/sidebar-right/edits/editors/NaiveUlEditor.vue'),
  naiveOl: () => import('@/components/sidebar-right/edits/editors/NaiveOlEditor.vue'),
  naiveLi: () => import('@/components/sidebar-right/edits/editors/NaiveLiEditor.vue'),
  naiveDivider: () => import('@/components/sidebar-right/edits/editors/NaiveDividerEditor.vue'),
  naiveAlert: () => import('@/components/sidebar-right/edits/editors/NaiveAlertEditor.vue'),
  naiveBackTop: () => import('@/components/sidebar-right/edits/editors/NaiveBackTopEditor.vue'),
  naiveQrCode: () => import('@/components/sidebar-right/edits/editors/NaiveQrCodeEditor.vue'),
  naiveProgress: () => import('@/components/sidebar-right/edits/editors/NaiveProgressEditor.vue'),
  naiveH1: () => import('@/components/sidebar-right/edits/editors/NaiveH1Editor.vue'),
  naiveH2: () => import('@/components/sidebar-right/edits/editors/NaiveH2Editor.vue'),
  naiveH3: () => import('@/components/sidebar-right/edits/editors/NaiveH3Editor.vue'),
  naiveH4: () => import('@/components/sidebar-right/edits/editors/NaiveH4Editor.vue'),
  naiveH5: () => import('@/components/sidebar-right/edits/editors/NaiveH5Editor.vue'),
  naiveH6: () => import('@/components/sidebar-right/edits/editors/NaiveH6Editor.vue'),
})
