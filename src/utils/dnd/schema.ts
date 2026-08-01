import type { FormKitSchemaFormKit } from '@formkit/core'

// 生成稳定的字段 key，用于拖拽过程中的字段身份识别
export const generateKey = () => {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

// 在 schema 树中按 __key 查找节点（用于从“真实 schema”读取最新 outerClass 等属性）
export const findSchemaByKey = (schema: any[], key: string): any | undefined => {
  for (const node of schema) {
    if (node && typeof node === 'object' && (node as any).__key === key) return node
    const children = (node as any)?.children
    if (Array.isArray(children)) {
      const found = findSchemaByKey(children, key)
      if (found) return found
    }
  }
  return undefined
}

// 将字段名规整为安全标识（小写、下划线、避免数字开头）
export const toSafeName = (input: unknown) => {
  const raw = typeof input === 'string' ? input : ''
  let name = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!name) name = 'field'
  if (/^\d/.test(name)) name = `field_${name}`
  return name
}

// 递归收集 schema 里所有已存在的 name，用于生成不冲突的新字段名
export const collectSchemaNames = (schema: FormKitSchemaFormKit[], names: Set<string>) => {
  for (const field of schema) {
    if (typeof field?.name === 'string' && field.name) names.add(field.name)
    const children = (field as any)?.children
    if (Array.isArray(children)) collectSchemaNames(children as FormKitSchemaFormKit[], names)
  }
}

// 生成唯一 name（如 name, name_1, name_2...）
export const ensureUniqueName = (base: string, existing: Set<string>) => {
  let name = base
  let i = 1
  while (existing.has(name)) {
    name = `${base}_${i}`
    i++
  }
  existing.add(name)
  return name
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
