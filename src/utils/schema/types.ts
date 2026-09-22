import type { FormKitSchemaFormKit } from '@formkit/core'

// ═══ 画布 / DnD 视角下的 schema 节点类型 ═══════════════════════════════════════
//
// FormKitSchemaFormKit 是 FormKit 自己对 "$formkit 语法糖节点" 的类型定义，本身带一个
// `Record<string, any>` 兜底签名（FormKit 的 schema 类型设计如此：允许任意扩展键）。
// 画布 / DnD 代码要读写的键（$cmp、$el、__key、outerClass、props 里的容器身份键等）
// 大多不在 FormKitSchemaProps 里显式声明，落在这个兜底签名里，本来就是 any——不需要
// `as any` 也能访问，只是没名字、没结构，IDE 也提示不出来。这里把它们显式列出来，
// 让这些键有名字、有类型，替代"反正是 any 就无脑 as any"的写法。
//
// children / if 这两个键 FormKit 自己已经声明了类型（children 是多种节点形态的联合，
// if 只声明了 string），但把它们放进和本类型其它扩展键同一个 `&` 交叉类型里，会导致
// TS 把联合类型拆开揉碎，产出一堆现实中不可能出现的分支（比如 "string 数组 与 string
// 的交叉"），实际用不了，所以这里不覆盖它们：
//   - children：按 FormKit 自己的类型读到手后用 Array.isArray 收窄，再按 SchemaNode[]
//     显式断言——不是 any，是"这些是我们自己拼装的画布节点，形态已由 Array.isArray
//     确认"这一事实的类型化表达；
//   - if：FormKit 类型只声明了 string，但本仓库在个别分支（如 canvas.ts 的
//     formatContainer、format-schema.ts）会直接写入已求值的布尔字面量（FormKit 的
//     schema 解释器本身也接受布尔值，只是类型定义没跟上）。读取 `.if` 或做
//     `typeof x === 'boolean'` 判断不受影响（string|undefined 上的 typeof 收窄
//     TS 不会报"恒为 false"）；只有把它赋回一个显式声明为 SchemaNode 的变量的 `.if`
//     字段才会报类型错，这类赋值点就地把目标变量放宽成 any（构造中的动态节点，见
//     canvas.ts formatContainer 顶部注释），不在这里强行加宽（加宽会被交叉类型吃掉，
//     起不到效果，见上面的解释）。
// 注：底子仍是 FormKitSchemaFormKit（$formkit 必填），这是有意的取舍——画布 / DnD 里的
// schema 节点数组在整个代码库里广泛以 FormKitSchemaFormKit[] 的形态流动（提交、DSL 往返、
// 渲染都是），把 SchemaNode 建成与它双向兼容能让这个类型直接替换那些位置的 any/unknown，
// 不用在几十个函数签名上跟着改。代价是：单个 $cmp/$el 节点字面量（没有 $formkit）如果
// 直接以 SchemaNode 类型声明会被判定缺少必填的 $formkit——这类"新建一个不带 $formkit 的
// 节点"的场景（多见于 canvas.ts 的 formatContainer 动态拼装分支）仍按 any 处理并加注释，
// 不强行用 SchemaNode，原因见该处注释。
export type SchemaNode = FormKitSchemaFormKit & {
  /** $cmp 组件节点的组件名（与 $formkit / $el 三选一，见 dsl/convert/shared.ts 的 inferRenderTarget） */
  $cmp?: string
  /** $el 原生标签节点的标签名 */
  $el?: string
  /** DnD 身份键：贯穿插入 / 移动 / 提交，用来识别“同一节点” */
  __key?: string
  /** 事件绑定：fromSchema/toSchema 收敛后的唯一真源（见 dsl/events.ts） */
  __bind?: string
  name?: string
  label?: string
  id?: string
  /** 表达式类静态节点承载的原始表达式文本 */
  expr?: string
  props?: SchemaNodeProps
  attrs?: Record<string, unknown> & { class?: string }
  /** 外框类：容器 / 字段宽度（col-span-N）、行高（row-span-N）等信息落在这里 */
  outerClass?: string
  validation?: unknown
  options?: unknown
}

/** $cmp / 容器节点的 props：身份键（keyProp，如 __listKey）、modelValue 等按容器规格
 *  动态挂载，键名不固定，仍需兜底索引签名；这里把代码里常读写的几个键显式列出来。 */
export interface SchemaNodeProps {
  name?: string
  id?: string
  outerClass?: string
  disabled?: boolean
  modelValue?: unknown
  showActions?: boolean
  [key: string]: unknown
}

/** 把 node.children 收窄为画布节点数组；FormKit 自身的 children 类型是
 *  `string | FormKitSchemaNode[] | FormKitSchemaCondition`，Array.isArray 缩小后
 *  仍是 FormKit 自己那套宽泛的节点联合，读不到 __key/$cmp 等本仓库扩展键，
 *  故在确认是数组之后按 SchemaNode[] 断言（数组元素本就是本文件拼装的节点）。 */
export function schemaChildren(node: { children?: unknown } | null | undefined): SchemaNode[] {
  return Array.isArray(node?.children) ? (node.children as SchemaNode[]) : []
}
