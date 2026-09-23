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
export const duplicateNode = (
  node: FormKitSchemaFormKit,
  existingNames: Set<string>,
): FormKitSchemaFormKit => {
  const val: SchemaNode = JSON.parse(JSON.stringify(node))
  if (typeof val !== 'object' || val === null) return val as FormKitSchemaFormKit
  const nextKey = generateKey()
  const nextName = val.$formkit === 'submit' ? val.name : generateNextFieldName(existingNames)
  if (val.$formkit === 'submit') {
    val.__key = nextKey
    val.outerClass = val.outerClass || 'col-span-12 pt-2'
    if (Array.isArray(val.children)) delete val.children
    return val as FormKitSchemaFormKit
  }
  // $cmp 节点的语义 name 在 props.name（DSL 回读取 props），顶层 name 仅画布展示，需同步
  if (typeof val.$cmp === 'string') {
    val.props =
      val.props && typeof val.props === 'object'
        ? { ...val.props, name: nextName, __key: nextKey }
        : { name: nextName, __key: nextKey }
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
  if (Array.isArray(val.children)) {
    val.children = schemaChildren(val).map((c) => duplicateNode(c, existingNames))
  }
  return val as FormKitSchemaFormKit
}
