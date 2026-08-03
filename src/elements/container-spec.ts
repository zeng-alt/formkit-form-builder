// ═══ 容器元素的数据结构规格（单一来源）═══════════════════════════════════════
// 每个容器元素声明其数据结构（决定 group/list 怎么包一层）、DnD 画布身份键、
// 以及 schema 输出主键。原先按 kind 分散硬编码的地方（convert-common / canvas /
// dnd/commit / FormSchemaRenderer / registry）统一读取这里的规格。
// 本模块是叶子模块（不 import 业务代码），供 dsl 与 elements 双向引用而不产生环。

export type ContainerDataShape = 'object' | 'arrayOfObjects' | 'objectOfObjects' | 'none'

export interface ContainerSpec {
  /** 数据结构（用户记法 → 语义名）：
   *  object({})           单对象：children 是对象字段（group 原生；card/inputGroup 壳 + group 包一层）
   *  arrayOfObjects([{}]) 对象数组：每条记录一个 group（list）
   *  objectOfObjects({{}}) 对象之对象：每个子节点一个 group（tabs panes）
   *  none(-)              无数据：纯展示壳（buttonGroup）
   */
  dataShape: ContainerDataShape
  /** DnD 画布身份键（props.<keyProp>），如 listKey / cardKey / groupKey 等 */
  keyProp: string
  /** schema 输出主键：'group'（原生 $formkit:group）| 'cmp'（$cmp:<type>） */
  primitive: 'group' | 'cmp'
}

export const containerSpecs: Record<string, ContainerSpec> = {
  group: { dataShape: 'object', keyProp: 'groupKey', primitive: 'group' },
  list: { dataShape: 'arrayOfObjects', keyProp: 'listKey', primitive: 'cmp' },
  card: { dataShape: 'object', keyProp: 'cardKey', primitive: 'cmp' },
  inputGroup: { dataShape: 'object', keyProp: 'inputGroupKey', primitive: 'cmp' },
  buttonGroup: { dataShape: 'none', keyProp: 'buttonGroupKey', primitive: 'cmp' },
  tabs: { dataShape: 'objectOfObjects', keyProp: 'tabsKey', primitive: 'cmp' },
}

export function getContainerSpec(type: string | undefined): ContainerSpec | null {
  if (!type) return null
  return containerSpecs[type] ?? null
}
