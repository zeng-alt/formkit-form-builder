// ═══ 节点 ↔ FormKit schema 公共转换（barrel）════════════════════════════════════
// 字段 / 容器 / 布局 / 静态节点的双向转换核心，注册表与 schema-adapter 共用。
// 每个节点显式携带 renderAs（formkit | cmp | el），toSchema 据此输出
// $formkit / $cmp / $el 节点；任何分类都能使用任意一种渲染原语。
//
// 按职责拆分为：
//   shared.ts            — 公共类型 + 渲染原语推断 + 通用节点头构造
//   field / container / layout / static.ts — 四类节点各自的 toSchema / fromSchema
//   dispatch.ts           — 按分类统一派发（注册表入口）
//   validation-parse.ts   — 校验数组语法解析（fromSchema 方向）
//   expr-parse.ts         — 旧表达式字符串解析（fromSchema 方向）
// 本文件只做对外聚合导出，不含实现；putByKind/applyByKind/buildNodeHead 等仅供
// field/container/layout/static 内部共用的 helper 不在此导出。

export {
  type SchemaNode,
  type ChildrenConvertCtx,
  type RenderTarget,
  matchSchemaKind,
} from './shared'

export { fieldNodeToSchema } from './field'
export { tabsPaneToSchema, tabsPaneFromSchema } from './layout'
export { nodeToSchemaByCategory, nodeFromSchemaByCategory } from './dispatch'
export { parseValidation } from './validation-parse'
export { parseExprString } from './expr-parse'
