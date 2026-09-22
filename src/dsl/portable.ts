// ═══ 可移植 DSL：剥离前端专用字段 ═════════════════════════════════════════════
// FormDefinition 里有两处字段是纯前端概念，对后端（如 Java）毫无意义：
//   - BaseNode.key：画布 DnD 身份标识（映射旧 schema 的 __key），用于拖拽排序 /
//     选中定位，与表单数据、业务语义无关。
//   - meta.rawSchema：schemaToDsl 对未注册类型的无损兜底（见 schema-adapter.ts
//     的 fallbackToNode），原样存了一份整个原始 schema 节点，只是为了保证前端渲染
//     不崩，同样不该进后端存储。
// 持久化到后端前先过 toPortableDefinition()，得到一份可以安全交给后端反序列化的
// FormDefinition：其余字段（id / name / props / visibleIf / validation / events 等）
// 原样保留，DSL 主体本身就是 JSON-safe 的。

import type { FormDefinition, FormNode } from '../types/dsl'

// 深拷贝：与 FormRenderer.vue 的 safeClone 同款兜底（老 runtime 没有 structuredClone
// 时退回 JSON 往返）。先整体深拷贝，后续原地删字段，不会碰到传入的原始对象。
function deepClone<T>(value: T): T {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

// 原地递归剥离 key / meta.rawSchema：只在 deepClone 产出的私有副本上操作。
function stripNodeInPlace(node: FormNode): void {
  delete (node as { key?: string }).key
  if (node.meta) {
    delete node.meta.rawSchema
    if (Object.keys(node.meta).length === 0) delete node.meta
  }
  const children = (node as { children?: FormNode[] }).children
  if (Array.isArray(children)) children.forEach(stripNodeInPlace)
}

/** 去掉仅前端使用的字段（BaseNode.key / meta.rawSchema），得到可安全交给后端
 *  持久化 / 反序列化的表单定义。深拷贝后剥离，不改动传入对象，也不改动其他任何字段。 */
export function toPortableDefinition(def: FormDefinition): FormDefinition {
  const next = deepClone(def)
  stripNodeInPlace(next.root)
  return next
}
