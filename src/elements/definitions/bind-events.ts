// 事件绑定能力常量：各字段/元素实际可触发并透传给 runBindCode 的事件集合。
// 与 ui/fields/*.vue 的绑定一致；BindEditor 按此过滤展示事件开关。
// 单一来源：elements/definitions（数据）与 sidebar-right/edits/editors（编辑面板）共用。

/** 输入类全事件（onChange/onInput/onFocus/onBlur）——支持焦点/失焦的文本、数字、下拉、日期等 */
export const INPUT_FULL_EVENTS = ['onChange', 'onInput', 'onFocus', 'onBlur']
/** 输入类基础事件（onChange/onInput）——开关、评分、颜色、勾选等不触发焦点事件的控件 */
export const INPUT_BASIC_EVENTS = ['onChange', 'onInput']
/** 展示类点击事件（onClick）——纯展示组件（头像/图片）仅可绑定点击 */
export const DISPLAY_CLICK_EVENTS = ['onClick']
/** 按钮类事件（onClick/onFocus/onBlur） */
export const BUTTON_EVENTS = ['onClick', 'onFocus', 'onBlur']
/** 无可绑定事件 */
export const NO_EVENTS: string[] = []
