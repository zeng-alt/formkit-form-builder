import type { FormKitSchemaFormKit } from '@formkit/core'
import { getContainerSpec } from '@/elements/container-spec'
import { schemaChildren, type SchemaNode } from '@/utils/schema/types'

// 生成稳定的字段 key，用于拖拽过程中的字段身份识别
export const generateKey = () => {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

// 在 schema 树中按 __key 查找节点（用于从“真实 schema”读取最新 outerClass 等属性）
export const findSchemaByKey = (schema: SchemaNode[], key: string): SchemaNode | undefined => {
  for (const node of schema) {
    if (node && typeof node === 'object' && node.__key === key) return node
    const found = findSchemaByKey(schemaChildren(node), key)
    if (found) return found
  }
  return undefined
}

// 递归收集 schema 里所有已存在的 name，用于生成不冲突的新字段名
export const collectSchemaNames = (schema: SchemaNode[], names: Set<string>) => {
  for (const field of schema) {
    if (typeof field?.name === 'string' && field.name) names.add(field.name)
    collectSchemaNames(schemaChildren(field), names)
  }
}

// 生成字段 name（作为提交后端的数据字段名）：field_1、field_2 ...
// 扫描现有 field_<n> 取最大序列号 +1，保证唯一且连续递增。
export const generateNextFieldName = (existing: Set<string>) => {
  let max = 0
  for (const name of existing) {
    const m = /^field_(\d+)$/.exec(name)
    if (m) max = Math.max(max, Number(m[1]))
  }
  let candidate = `field_${max + 1}`
  while (existing.has(candidate)) {
    max++
    candidate = `field_${max + 1}`
  }
  existing.add(candidate)
  return candidate
}

// 复制节点：深拷贝并重新生成 __key / name / id（连同 children 递归处理），
// 其余配置属性保持不变。画布复制按钮与容器复制共用；name 避开全树已存在的字段名。
//
// 建立数据作用域的容器（card/inputGroup/list/group）整体复制时，只改容器自身的
// name/label，不改其子项——子项处在容器新生成的数据作用域里（运行时各包一层 group/list），
// 保留原名不会撞车，也保住了字段原本的语义名字；不建立作用域的（tabs/steps 的直接子 pane、
// badge/buttonGroup/dataTable 的子项）仍需重新生成，规则见下方 childPreserve。
// labelSuffix 只加在被点击复制的顶层节点上（副本「 副本」/" copy" 后缀），递归到子孙
// 节点时不再传，避免整棵子树的 label 都被加后缀。
function duplicateNodeInner(
  node: FormKitSchemaFormKit,
  existingNames: Set<string>,
  preserveOwnName: boolean,
  labelSuffix: string | undefined,
): FormKitSchemaFormKit {
  const val: SchemaNode = JSON.parse(JSON.stringify(node))
  if (typeof val !== 'object' || val === null) return val as FormKitSchemaFormKit
  const nextKey = generateKey()
  const nextName =
    val.$formkit === 'submit'
      ? val.name
      : preserveOwnName
        ? val.name
        : generateNextFieldName(existingNames)
  if (val.$formkit === 'submit') {
    val.__key = nextKey
    val.outerClass = val.outerClass || 'col-span-12 pt-2'
    if (Array.isArray(val.children)) delete val.children
    return val as FormKitSchemaFormKit
  }
  // $cmp 节点的语义 name/id 在 props 里（DSL 回读 fieldNodeFromSchema 优先取
  // props.id 当作节点 id，见 dsl/convert/field.ts），顶层 name 仅画布展示，需同步；
  // props.id 同样必须刷新——否则 preserveOwnName 时 props.name 与旧的 props.id
  // 恰好相等，fieldNodeFromSchema 会判定"name 与 id 相同故省略 name"，读出的 DSL
  // 节点既丢了 name、id 又与原节点重复（同 utils/dnd/commit.ts 的 normalizeInsertValues
  // 保持一致的处理方式）
  if (typeof val.$cmp === 'string') {
    val.props =
      val.props && typeof val.props === 'object'
        ? { ...val.props, name: nextName, id: `field_${nextKey}`, __key: nextKey }
        : { name: nextName, id: `field_${nextKey}`, __key: nextKey }
  }
  // 容器按规格注入各自的身份键（keyProp），modelValue 由 children 承载，统一从 props 删除
  const spec = getContainerSpec(val.$cmp ?? val.$formkit)
  if (spec && spec.primitive === 'cmp') {
    const props = { ...val.props, [spec.keyProp]: nextKey }
    delete props.modelValue
    val.__key = nextKey
    val.name = nextName
    val.id = `field_${nextKey}`
    val.props = props
    val.children = schemaChildren(val)
  } else {
    val.__key = nextKey
    val.name = nextName
    val.id = `field_${nextKey}`
  }
  // label 落点不统一：$formkit 原生字段用顶层 label，$cmp 包装字段/容器（如这里的
  // text 输入框、card/tabs 等容器）用 props.label——两处都要检查，否则 $cmp 节点的
  // 副本不会带上后缀
  if (labelSuffix) {
    if (typeof val.label === 'string' && val.label) {
      val.label = `${val.label}${labelSuffix}`
    } else if (val.props && typeof val.props.label === 'string' && val.props.label) {
      val.props = { ...val.props, label: `${val.props.label}${labelSuffix}` }
    }
  }
  // 只有真正建立数据作用域的容器，子项才保留原名：pane（tabs/steps 的子项，__paneType
  // 标记）、dataShape 为 object / array 的容器（group/card/inputGroup/list，运行时各包一层
  // group/list）。objectOfObjects（tabs/steps 本身）的直接子项是 pane，与其兄弟同层，必须
  // 重新生成；dataShape 为 none 的容器（badge/buttonGroup/dataTable）不包 group，子字段与
  // 容器的兄弟同处一层，保留原名会与原件的子字段撞名、数据互相覆盖，同样必须重新生成
  const isPane = typeof (val as { __paneType?: unknown }).__paneType === 'string'
  const childPreserve =
    isPane ||
    (spec ? spec.dataShape === 'object' || spec.dataShape === 'array' : val.$formkit === 'group')
  if (Array.isArray(val.children)) {
    val.children = schemaChildren(val).map((c) =>
      duplicateNodeInner(c, existingNames, childPreserve, undefined),
    )
  }
  return val as FormKitSchemaFormKit
}

export const duplicateNode = (
  node: FormKitSchemaFormKit,
  existingNames: Set<string>,
  opts?: { labelSuffix?: string },
): FormKitSchemaFormKit => duplicateNodeInner(node, existingNames, false, opts?.labelSuffix)
