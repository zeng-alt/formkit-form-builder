// 暗色主题：只组合本库实际用到的 naive-ui 组件的暗色主题，不用官方 darkTheme。
//
// 背景：naive-ui 官方导出的 darkTheme / lightTheme 内部静态 import 了全部一百多个
// 组件的主题对象（包含大量本库完全没用到的组件，如 Carousel / Timeline / Result 等），
// 哪怕这些组件从未被渲染，它们的主题模块也会被打进产物。用 createTheme 按需组合，
// 只把清单里列出的组件的暗色主题拼起来，未列出的组件不会被引入。
//
// 清单维护：清单必须与仓库里实际 import 的 `N*` 组件（含 useMessage / useNotification /
// useDialog 对应的 message / notification / dialog，以及 NConfigProvider 等 provider）
// 保持一致，漏掉某个组件会导致它在暗色主题下显示成亮色。src/theme/__tests__/dark-theme.test.ts
// 会扫描 src/** 里实际用到的组件，逐个校验这里是否覆盖，新增组件用法时那份测试会先失败提醒。
//
// ColorPicker / Image / QrCode 三个组件的暗色主题没有从 naive-ui 顶层入口导出
// （官方 darkTheme 内部也是从各自子路径深度 import 的），所以这三个从子路径单独引入。
import {
  alertDark,
  autoCompleteDark,
  avatarDark,
  backTopDark,
  badgeDark,
  buttonDark,
  cardDark,
  cascaderDark,
  checkboxDark,
  collapseDark,
  createTheme,
  dataTableDark,
  datePickerDark,
  dividerDark,
  dropdownDark,
  dynamicTagsDark,
  emptyDark,
  inputDark,
  inputNumberDark,
  layoutDark,
  mentionDark,
  messageDark,
  modalDark,
  notificationDark,
  paginationDark,
  popconfirmDark,
  popoverDark,
  popselectDark,
  progressDark,
  radioDark,
  rateDark,
  scrollbarDark,
  selectDark,
  sliderDark,
  spaceDark,
  spinDark,
  stepsDark,
  switchDark,
  tabsDark,
  tagDark,
  timePickerDark,
  tooltipDark,
  transferDark,
  treeDark,
  treeSelectDark,
  typographyDark,
  uploadDark,
  type GlobalTheme,
} from 'naive-ui'
import { colorPickerDark } from 'naive-ui/es/color-picker/styles'
import { imageDark } from 'naive-ui/es/image/styles'
import { qrcodeDark } from 'naive-ui/es/qr-code/styles'

/**
 * 本库实际用到的组件的暗色主题组合。
 * NH1~NH6 / NP / NA / NLi / NUl / NOl / NBlockquote / NText 共用 Typography；
 * NCheckboxGroup 共用 Checkbox；NRadioButton / NRadioGroup 共用 Radio；
 * NCollapseItem 共用 Collapse；NLayoutSider 共用 Layout；NTabPane 共用 Tabs；
 * NStep 共用 Steps；NUploadDragger 共用 Upload——这些子组件不单独调用 useTheme，
 * 不需要单独列出。NButtonGroup / NInputGroup / NConfigProvider 是纯结构组件，
 * 本身不消费主题，也不需要列出。
 */
export const builderDarkTheme: GlobalTheme = createTheme([
  alertDark,
  autoCompleteDark,
  avatarDark,
  backTopDark,
  badgeDark,
  buttonDark,
  cardDark,
  cascaderDark,
  checkboxDark,
  collapseDark,
  colorPickerDark,
  dataTableDark,
  datePickerDark,
  dividerDark,
  dropdownDark,
  dynamicTagsDark,
  emptyDark,
  imageDark,
  inputDark,
  inputNumberDark,
  layoutDark,
  mentionDark,
  messageDark,
  modalDark,
  notificationDark,
  paginationDark,
  popconfirmDark,
  popoverDark,
  popselectDark,
  progressDark,
  qrcodeDark,
  radioDark,
  rateDark,
  scrollbarDark,
  selectDark,
  sliderDark,
  spaceDark,
  spinDark,
  stepsDark,
  switchDark,
  tabsDark,
  tagDark,
  timePickerDark,
  tooltipDark,
  transferDark,
  treeDark,
  treeSelectDark,
  typographyDark,
  uploadDark,
])
