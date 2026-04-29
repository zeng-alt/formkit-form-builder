import type { FormKitSchemaFormKit } from '@formkit/core'

export function toCanvasSchemaNode(node: FormKitSchemaFormKit): FormKitSchemaFormKit {
  const anyNode: any = node as any
  if (!anyNode || typeof anyNode !== 'object') return node
  const next: any = { ...anyNode }
  if ('if' in next) delete next.if
  if ('__raw__ifExpression' in next) delete next.__raw__ifExpression
  if ('bind' in next && typeof next.bind !== 'string') {
    if (!next.__bind) next.__bind = next.bind
    delete next.bind
  }
  if (Array.isArray(next.children)) {
    next.children = next.children.map((c: any) => toCanvasSchemaNode(c))
  }
  return next as FormKitSchemaFormKit
}
