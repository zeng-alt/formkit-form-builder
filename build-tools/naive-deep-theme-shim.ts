// UMD 构建专用 shim：只在 vite.config.ts 的 umd-index / umd-renderer 两个模式下，
// 通过 resolve.alias 顶替 src/theme/dark-theme.ts 里对 naive-ui 三个子路径
// （color-picker / image / qr-code 的 styles）的深度 import。
//
// 背景：ColorPicker / Image / QrCode 的暗色主题没有从 naive-ui 包顶层导出，ES 产物
// 里按子路径深度 import 没问题——使用方自己的构建工具能按同样的路径解析到它们装的
// naive-ui。但 UMD 单文件产物运行时 naive-ui 整体只是一个全局变量，没有这三个子
// 路径对应的全局变量可外部化，外部化后加载即报错；直接把子路径强制内联又会把
// naive-ui 内部一整条依赖链（含独立的颜色计算工具库）重复打进产物，体积代价远超预期。
//
// 这三个组件的暗色主题其实已经是 naive-ui 自己构造的 darkTheme 对象上的字段
// （构造过程见 naive-ui 的 es/themes/dark.mjs），而 darkTheme 本身走的是普通的
// naive-ui 顶层具名导出，跟其余组件一样按 external + globals 外部化——UMD 环境里
// naive-ui 本来就是不做按组件裁剪的整体全局变量，从它身上取这三个字段不会增加
// 实际体积。
import { darkTheme } from 'naive-ui'

export const colorPickerDark = darkTheme.ColorPicker
export const imageDark = darkTheme.Image
export const qrcodeDark = darkTheme.QrCode
