// ═══ DSL 定义 ══════════════════════════════════════════════════════════════════
// 语义化、版本化、JSON-safe 的表单描述，与 FormKit 渲染层完全解耦。
// 后端（如 Java）可直接反序列化：version 用于兼容迁移，category 用于多态判别。

export const DSL_VERSION = 2

// ─── 语义分层标识 ───────────────────────────────────────────────────────────────
// 替代旧的 kind: 'formkit' | 'cmp' | 'el' 与 form: 'field' | 'container' | 'static'
export type NodeCategory = 'field' | 'container' | 'layout' | 'static'

// ─── 渲染原语 ──────────────────────────────────────────────────────────────────
// 每个节点显式声明它对应 FormKit schema 的哪种原语，toSchema 时据此产出
// $formkit / $cmp / $el 节点；字段 / 容器 / 静态展示均可使用任意一种。
export type RenderKind = 'formkit' | 'cmp' | 'el'

// ─── 可移植表达式 AST（JSON-safe，Java 可解析/生成/校验）────────────────────────
export type StaticValue = any

export interface ExprLiteral {
  type: 'literal'
  value: StaticValue
}
export interface ExprField {
  type: 'field'
  /** 引用表单数据里的字段名（提交给后端的数据 key） */
  name: string
}
export interface ExprCall {
  type: 'call'
  /** 内置函数名，见 src/dsl/expr-builtins.ts；前后端共用同一份清单 */
  fn: string
  args: Expr[]
}

export type Expr = ExprLiteral | ExprField | ExprCall

/** 字段值：静态值 或 表达式（{ $expr: AST }） */
export type FieldValue = StaticValue | { $expr: Expr }

// ─── 校验规则（结构化，JSON-safe）───────────────────────────────────────────────
export interface ValidationRule {
  rule: string
  args?: StaticValue[]
  message?: string
  debounce?: number // (200) 防抖毫秒数
  empty?: boolean // +    空值也执行
  force?: boolean // *    前置规则失败也执行
  optional?: boolean // ?    非阻塞，表单仍可提交
}

// ─── 选项（select / radio / checkbox / cascader 等）─────────────────────────────
export interface OptionItem {
  label: string
  value: StaticValue
  disabled?: boolean
  children?: OptionItem[]
  [key: string]: unknown
}

/** 动态字典来源：options 为对象 { dynamic, code, label? }，运行时用 config.fetchDictionary 拉取 */
export interface DynamicOptionSource {
  /** 标记为动态字典来源（区别于静态 OptionItem[]） */
  dynamic: true
  /** 字典编码 */
  code: string
  /** 可选标签 */
  label?: string
}

// ─── 布局信息（每个节点可选）─────────────────────────────────────────────────────
export interface NodeLayout {
  /** 栅格占位（基于 settings.columns，默认 12） */
  colspan?: number
  rowspan?: number
  /** 显式宽度（px / 百分比），grid 模式下忽略 */
  width?: number | string
  order?: number
  /** 响应式断点覆盖 */
  responsive?: {
    sm?: NodeLayout
    md?: NodeLayout
    lg?: NodeLayout
    xl?: NodeLayout
  }
}

// ─── 事件绑定（handler 为不透明函数体字符串，前端运行时执行，Java 透传）──────────
export type FormKitEvent = 'change' | 'input' | 'blur' | 'focus'
export type ElEvent =
  | 'click'
  | 'dblclick'
  | 'mouseenter'
  | 'mouseleave'
  | 'keydown'
  | 'keyup'
  | 'keypress'
  | 'submit'
export type FormEvent = FormKitEvent | ElEvent

export interface EventBinding {
  event: FormEvent
  handler: string
}

// ─── 节点基类 ────────────────────────────────────────────────────────────────────
export interface BaseNode {
  /** 稳定唯一 id（前端生成，用于树操作 / 选中 / 绑定） */
  id: string
  /** 画布 DnD 身份（映射 legacy schema 的 __key；非画布场景可省略） */
  key?: string
  /** 字段名（提交到后端的数据 key）；容器 / 布局 / 静态节点可不填 */
  name?: string
  label?: string
  /** 组件类型标识（见注册表：field / container / layout / static 各自的 type） */
  type: string
  category: NodeCategory
  /** 渲染原语：formkit → $formkit: type；cmp → $cmp: target；el → $el: target */
  renderAs: RenderKind
  /** 渲染目标：renderAs='cmp' 时为 $cmp 组件名，'el' 时为标签名；'formkit' 时缺省即 type */
  target?: string
  /** 类型级扩展点：各 type 专有属性 */
  props?: Record<string, unknown>
  /** 条件显示：布尔表达式 AST */
  visibleIf?: Expr
  /** 布局信息（colspan / rowspan） */
  layout?: NodeLayout
  /** 原始 outerClass（含 pt-2 等附加类；与 layout 同时保留保证往返无损） */
  outerClass?: string
  events?: EventBinding[]
  /** 任意业务元数据，Java 原样透传 */
  meta?: Record<string, unknown>
}

// ─── 字段节点（产出数据 key）─────────────────────────────────────────────────────
export interface FieldNode extends BaseNode {
  category: 'field'
  /** 初始值 */
  value?: FieldValue
  validation?: ValidationRule[]
  /** select / radio / checkbox 等选项（静态数组，或 { dynamic, code } 动态字典） */
  options?: OptionItem[] | DynamicOptionSource
}

// ─── 数据结构容器（与数据模型对应）───────────────────────────────────────────────
export interface ContainerNode extends BaseNode {
  category: 'container'
  /** object → group（嵌套对象）；array → list / repeater / inputGroup */
  dataType?: 'object' | 'array'
  children: FormNode[]
}

// ─── 布局节点（纯布局，不产出数据 key）──────────────────────────────────────────
export type LayoutType = 'grid' | 'row' | 'column' | 'card' | 'tabs' | 'tabsPane'

export interface LayoutNode extends BaseNode {
  category: 'layout'
  type: LayoutType
  children: FormNode[]
}

// ─── 静态展示节点（文本 / 标题 / 按钮 / 分割线 等）───────────────────────────────
export interface StaticNode extends BaseNode {
  category: 'static'
  /** 文本内容（text / 标题 / 分割线） */
  text?: string
  /** 图片地址 */
  src?: string
}

export type FormNode = FieldNode | ContainerNode | LayoutNode | StaticNode

// ─── 表单定义（顶层）────────────────────────────────────────────────────────────
export interface FormSettings {
  /** 布局方向 */
  layout: 'vertical' | 'horizontal' | 'inline'
  labelWidth?: number
  labelAlign?: 'left' | 'right' | 'top'
  /** 根栅格列数（默认 12） */
  columns?: number
  fullWidth?: boolean
}

export interface FormDefinition {
  version: number
  id: string
  name: string
  description?: string
  /** 表单树根节点：必须是容器，字段只能挂在容器 / 布局内 */
  root: ContainerNode
  settings: FormSettings
  meta?: Record<string, unknown>
}

// ─── 向后兼容别名（迁移期）───────────────────────────────────────────────────────
export type ConditionNode = Expr
