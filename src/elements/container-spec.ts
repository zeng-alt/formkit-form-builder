// ═══ 容器元素的数据结构规格（单一来源）═══════════════════════════════════════
// 每个容器元素声明其数据结构（决定 group/list 怎么包一层）、DnD 画布身份键、
// 以及 schema 输出主键。原先按 kind 分散硬编码的地方（convert-common / canvas /
// dnd/commit / FormSchemaRenderer / registry）统一读取这里的规格。
// 本模块是叶子模块（不 import 业务代码），供 dsl 与 elements 双向引用而不产生环。

export type ContainerDataShape = 'object' | 'array' | 'arrayOfObjects' | 'objectOfObjects' | 'none'

export interface ContainerSpec {
  /** 数据结构（用户记法 → 语义名）：
   *  object({})           单对象：children 是对象字段（group 原生；card/inputGroup 壳 + group 包一层）
   *  array([])            动态数组：单条记录是标量/单字段（list），
   *                       或预置 group 的对象数组 [{...}]（nestedList 便捷项）
   *  arrayOfObjects([{}]) 遗留别名：语义等同 array（历史数据/扩展注册兼容），渲染同 list
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
  list: { dataShape: 'array', keyProp: 'listKey', primitive: 'cmp' },
  card: { dataShape: 'object', keyProp: 'cardKey', primitive: 'cmp' },
  inputGroup: { dataShape: 'object', keyProp: 'inputGroupKey', primitive: 'cmp' },
  buttonGroup: { dataShape: 'none', keyProp: 'buttonGroupKey', primitive: 'cmp' },
  badge: { dataShape: 'none', keyProp: 'badgeKey', primitive: 'cmp' },
  tabs: { dataShape: 'objectOfObjects', keyProp: 'tabsKey', primitive: 'cmp' },
  steps: { dataShape: 'objectOfObjects', keyProp: 'stepsKey', primitive: 'cmp' },
  // 数据表格：列与数据在右侧面板配置，无 DnD 子节点，纯展示壳（同 buttonGroup）
  dataTable: { dataShape: 'none', keyProp: 'dataTableKey', primitive: 'cmp' },
}

export function getContainerSpec(type: string | undefined): ContainerSpec | null {
  if (!type) return null
  return containerSpecs[type] ?? null
}
