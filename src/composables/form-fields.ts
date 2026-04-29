import type { DslCondition, DslNode, DslRules } from '@/dsl/types'
import { computed, ref } from 'vue'
import { formDsl, selectedId, selectedTarget } from '../utils/default-form-elements'
import { commitSchema } from './schema-history'

export const isLoading = ref(false)

export type CanvasView = 'desktop' | 'tablet' | 'mobile'
export const canvasView = ref<CanvasView>('desktop')

type Found = { node: DslNode; path: number[] } | null

export const findDslNodeById = (nodes: any[], id: string, path: number[] = []): Found => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (!node || typeof node !== 'object') continue
    const nextPath = [...path, i]
    if (node.id === id) return { node: node as DslNode, path: nextPath }
    const children = (node as any)?.children
    if (Array.isArray(children)) {
      const found = findDslNodeById(children, id, nextPath)
      if (found) return found
    }
  }
  return null
}

const updateAtPath = (nodes: any[], path: number[], nextNode: any): any[] => {
  if (path.length === 0) return nodes
  const nextNodes = [...nodes]
  const idx0 = path[0]!
  if (path.length === 1) {
    nextNodes[idx0] = nextNode
    return nextNodes
  }
  const parent = { ...(nextNodes[idx0] as any) }
  nextNodes[idx0] = parent
  let cursor: any = parent
  for (let i = 1; i < path.length - 1; i++) {
    const idx = path[i]!
    const arr = Array.isArray(cursor.children) ? [...cursor.children] : []
    const child = { ...(arr[idx] as any) }
    arr[idx] = child
    cursor.children = arr
    cursor = child
  }
  const lastIdx = path[path.length - 1]!
  const lastArr = Array.isArray(cursor.children) ? [...cursor.children] : []
  lastArr[lastIdx] = nextNode
  cursor.children = lastArr
  return nextNodes
}

const setNodePartial = (patch: Partial<DslNode>) => {
  const id = selectedId.value
  if (!id) return
  const found = findDslNodeById(formDsl.value.nodes as any[], id)
  if (!found) return
  const current = found.node
  const nextNode: DslNode = {
    ...current,
    ...patch,
    props: patch.props === undefined ? current.props : patch.props,
    rules: patch.rules === undefined ? current.rules : patch.rules,
    layout: patch.layout === undefined ? current.layout : patch.layout,
    logic: patch.logic === undefined ? current.logic : patch.logic,
  }
  const nextNodes = updateAtPath(formDsl.value.nodes as any[], found.path, nextNode)
  commitSchema({ ...formDsl.value, nodes: nextNodes }, { reason: 'node-edit', merge: true })
}

export const selectedNode = computed(() => {
  const id = selectedId.value
  if (!id) return null
  const found = findDslNodeById(formDsl.value.nodes as any[], id)
  return found?.node ?? null
})

export function useFormField() {
  const selectedIsForm = computed(() => selectedTarget.value === 'form')
  const hasField = computed(() => selectedIsForm.value || !!selectedNode.value)

  const currentFieldType = computed(() => {
    if (selectedIsForm.value) return 'form'
    return selectedNode.value?.type ?? null
  })

  const formName = computed<string>({
    get: () => formDsl.value.formName,
    set: (value: string) => {
      const next = value.trim() || 'form'
      commitSchema({ ...formDsl.value, formName: next }, { reason: 'form-edit', merge: true })
    },
  })

  const formLabelPosition = computed<'top' | 'left'>({
    get: () => formDsl.value.meta.labelPosition,
    set: (value: 'top' | 'left') => {
      commitSchema(
        { ...formDsl.value, meta: { ...formDsl.value.meta, labelPosition: value } },
        { reason: 'form-edit', merge: true },
      )
    },
  })

  const formLabelWidth = computed<number>({
    get: () => formDsl.value.meta.labelWidth,
    set: (value: number) => {
      const n = Number(value)
      const next = Number.isFinite(n) ? Math.max(0, Math.min(2000, Math.round(n))) : 80
      commitSchema(
        { ...formDsl.value, meta: { ...formDsl.value.meta, labelWidth: next } },
        { reason: 'form-edit', merge: true },
      )
    },
  })

  const fieldName = computed<string>({
    get: () => selectedNode.value?.field ?? '',
    set: (value: string) => setNodePartial({ field: value.trim() || undefined }),
  })

  const label = computed<string>({
    get: () => selectedNode.value?.label ?? '',
    set: (value: string) => setNodePartial({ label: value }),
  })

  const placeholder = computed<string>({
    get: () => String(selectedNode.value?.props?.placeholder ?? ''),
    set: (value: string) => {
      const nextProps = { ...selectedNode.value?.props, placeholder: value }
      setNodePartial({ props: nextProps })
    },
  })

  const span = computed<number>({
    get: () => Number(selectedNode.value?.layout?.span ?? 12),
    set: (value: number) => {
      const n = Number(value)
      const nextSpan = Number.isFinite(n) ? Math.max(1, Math.min(12, Math.round(n))) : 12
      setNodePartial({ layout: { ...selectedNode.value?.layout, span: nextSpan } })
    },
  })

  const rules = computed<DslRules>({
    get: () => selectedNode.value?.rules ?? {},
    set: (value: DslRules) => setNodePartial({ rules: value }),
  })

  const visibleIf = computed<DslCondition | undefined>({
    get: () => selectedNode.value?.logic?.visibleIf,
    set: (value: DslCondition | undefined) =>
      setNodePartial({ logic: { ...selectedNode.value?.logic, visibleIf: value } }),
  })

  const disabledIf = computed<DslCondition | undefined>({
    get: () => selectedNode.value?.logic?.disabledIf,
    set: (value: DslCondition | undefined) =>
      setNodePartial({ logic: { ...selectedNode.value?.logic, disabledIf: value } }),
  })

  const availableFieldNames = computed(() => {
    const out: string[] = []
    const walk = (nodes: DslNode[]) => {
      for (const n of nodes) {
        if (n.field) out.push(n.field)
        if (Array.isArray(n.children)) walk(n.children)
      }
    }
    walk(formDsl.value.nodes)
    return Array.from(new Set(out))
  })

  return {
    hasField,
    selectedIsForm,
    currentFieldType,
    formName,
    formLabelPosition,
    formLabelWidth,
    fieldName,
    label,
    placeholder,
    span,
    rules,
    visibleIf,
    disabledIf,
    availableFieldNames,
  }
}
