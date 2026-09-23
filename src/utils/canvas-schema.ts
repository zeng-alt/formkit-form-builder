import { toRaw } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { schemaChildren, type SchemaNode } from './schema/types'

// 画布渲染身份缓存：按源节点（toRaw 后）缓存喂给 FormKitSchema 的单元素数组 [node]。
// 同一个源 schema 节点每次都得到同一个数组引用，FormKitSchema 的 schema prop 因此
// 保持 === 不变，未改动的字段就不会被 Vue 判定为"props 变了"而重新渲染。
// WeakMap 键是源节点本身：dslToSchema 缓存命中时源节点引用不变 ⇒ 这里也命中。
// 外层再按 compute 分桶：不同的渲染管线（画布上下文 / 无上下文兜底）对同一源节点
// 产出不同结果，不能共用一份缓存；compute 因此必须是稳定的函数引用（模块级常量）。
const canvasSchemaArrayCache = new WeakMap<object, WeakMap<object, unknown[]>>()

/** 按源节点身份缓存 compute(field) 的单元素数组结果；compute 必须是 field 的纯函数且引用稳定。 */
export function getCanvasSchemaArray(
  field: unknown,
  compute: (node: unknown) => unknown,
): unknown[] {
  if (!field || typeof field !== 'object') return [compute(field)]
  let bucket = canvasSchemaArrayCache.get(compute)
  if (!bucket) {
    bucket = new WeakMap()
    canvasSchemaArrayCache.set(compute, bucket)
  }
  const raw = toRaw(field as object)
  const cached = bucket.get(raw)
  if (cached) return cached
  const next = [compute(field)]
  bucket.set(raw, next)
  return next
}

// 恒等 compute：不对节点做任何改写，单纯需要"同一个源节点每次拿到同一个单元素数组"
// 时复用（如 FormRenderer 按顶层节点拆分 FormKitSchemaWrapper，见 D4）。compute
// 引用必须稳定（模块级常量），否则退化为每次都不命中缓存。
const identityCompute = (node: unknown): unknown => node

/** 按源节点身份缓存的单元素数组，节点本身不做任何转换（对照 getCanvasSchemaArray
 *  的画布场景，这里给渲染态的“顶层节点各自一个 FormKitSchemaWrapper”场景用）。 */
export function getSingleNodeSchemaArray(node: unknown): unknown[] {
  return getCanvasSchemaArray(node, identityCompute)
}

export function toCanvasSchemaNode(node: FormKitSchemaFormKit): FormKitSchemaFormKit {
  if (!node || typeof node !== 'object') return node
  const next: SchemaNode = { ...node }
  if ('if' in next) delete next.if
  if ('__raw__ifExpression' in next) delete next.__raw__ifExpression
  if ('bind' in next && typeof next.bind !== 'string') {
    if (!next.__bind) next.__bind = next.bind
    delete next.bind
  }
  // $cmp 组件把顶层 __key 一并收进 props，供组件内联编辑写回时定位节点
  if (typeof next.$cmp === 'string' && typeof next.__key === 'string') {
    next.props = { ...next.props, __key: next.__key }
  }
  if (Array.isArray(next.children)) {
    next.children = schemaChildren(next).map((c) => toCanvasSchemaNode(c))
  }
  return next
}
