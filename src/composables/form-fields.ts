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

export const selectedField = selectedNode

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

  const help = computed<string>({
    get: () => String(selectedNode.value?.props?.help ?? ''),
    set: (value: string) => {
      const nextProps = { ...selectedNode.value?.props, help: value }
      setNodePartial({ props: nextProps })
    },
  })

  const fieldValue = computed<string>({
    get: () => {
      const v = selectedNode.value?.props?.value
      if (v === null || v === undefined) return ''
      return String(v)
    },
    set: (value: string) => {
      const nextProps = { ...selectedNode.value?.props, value: value === '' ? undefined : value }
      setNodePartial({ props: nextProps })
    },
  })

  const rawProps = computed<Record<string, unknown>>({
    get: () => (selectedNode.value?.props && typeof selectedNode.value.props === 'object' ? selectedNode.value.props : {}),
    set: (value) => {
      setNodePartial({ props: value && typeof value === 'object' ? value : undefined })
    },
  })

  const rawPropsJson = computed<string>({
    get: () => JSON.stringify(rawProps.value ?? {}, null, 2),
    set: (value: string) => {
      try {
        const parsed = JSON.parse(value)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
        rawProps.value = parsed as Record<string, unknown>
      } catch {
        return
      }
    },
  })

  const createPropsProp = <T>(key: string, defaultValue: T) => {
    return computed({
      get: () => ((rawProps.value as any)?.[key] ?? defaultValue) as T,
      set: (value: T) => {
        rawProps.value = { ...rawProps.value, [key]: value }
      },
    })
  }

  const createButtonProp = <T>(key: string, defaultValue: T) => {
    return computed({
      get: () => (((rawProps.value as any)?.buttonProps ?? {}) as any)?.[key] ?? defaultValue,
      set: (value: T) => {
        const prev = (rawProps.value as any)?.buttonProps
        const bag = prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...(prev as any) } : {}
        bag[key] = value
        rawProps.value = { ...rawProps.value, buttonProps: bag }
      },
    }) as any
  }

  const optionsRaw = computed<unknown>({
    get: () => (rawProps.value as any)?.options ?? [],
    set: (value: unknown) => {
      rawProps.value = { ...rawProps.value, options: value }
    },
  })

  const modelValue = computed<string[]>({
    get: () => {
      const raw = optionsRaw.value
      if (!Array.isArray(raw)) return []
      return raw.filter((v): v is string => typeof v === 'string')
    },
    set: (value: string[]) => {
      optionsRaw.value = value
    },
  })

  const min = computed<number | undefined>({
    get: () => {
      const v = (rawProps.value as any)?.min
      return typeof v === 'number' ? v : undefined
    },
    set: (value: number | undefined) => {
      rawProps.value = { ...rawProps.value, min: value }
    },
  })

  const max = computed<number | undefined>({
    get: () => {
      const v = (rawProps.value as any)?.max
      return typeof v === 'number' ? v : undefined
    },
    set: (value: number | undefined) => {
      rawProps.value = { ...rawProps.value, max: value }
    },
  })

  const whichNumber = computed<string>({
    get: () => {
      const step = (rawProps.value as any)?.step
      if (step === 1 || step === '1') return 'integer'
      return 'float'
    },
    set: (value: string) => {
      rawProps.value = { ...rawProps.value, step: value === 'integer' ? 1 : 0.1 }
    },
  })

  const numOfFiles = computed<string>({
    get: () => ((rawProps.value as any)?.multiple ?? false ? 'true' : 'false'),
    set: (value: string) => {
      rawProps.value = { ...rawProps.value, multiple: value === 'true' }
    },
  })

  const rowSpan = computed<number>({
    get: () => Number(selectedNode.value?.layout?.rowSpan ?? 1),
    set: (value: number) => {
      const n = Number(value)
      const next = Number.isFinite(n) ? Math.max(1, Math.min(6, Math.round(n))) : 1
      setNodePartial({ layout: { ...selectedNode.value?.layout, rowSpan: next } })
    },
  })

  const validationString = computed<string>({
    get: () => selectedNode.value?.rules?.validation ?? '',
    set: (value: string) => {
      const next = value.trim()
      setNodePartial({ rules: { ...selectedNode.value?.rules, validation: next || undefined } })
    },
  })

  const validationStringLength = computed(() => {
    if (!validationString.value) return 0
    return validationString.value.split('|').filter(Boolean).length
  })

  const updateValidationString = (value: string, active: boolean = true) => {
    const currentValidation = validationString.value.split('|').filter(Boolean)
    let newValidation: string[]

    if (!value.includes(':')) {
      if (currentValidation.includes(value)) {
        newValidation = currentValidation.filter((item: string) => item !== value)
      } else {
        newValidation = [...currentValidation, value]
      }
      validationString.value = newValidation.join('|')
      return
    }

    const [validationType, validationValue] = value.split(':')
    if (currentValidation.includes(value) && !active) {
      newValidation = currentValidation.filter((item: string) => item !== value)
    } else {
      const indexOfType = currentValidation.findIndex((item: string) => item.startsWith(`${validationType}:`))
      if (indexOfType === -1) {
        newValidation = [...currentValidation, value]
      } else {
        newValidation = [
          ...currentValidation.slice(0, indexOfType),
          `${validationType}:${validationValue}`,
          ...currentValidation.slice(indexOfType + 1),
        ]
      }
    }
    validationString.value = newValidation.join('|')
  }

  const isActive = (fn: (arg0: string) => boolean, strVal: string) => {
    return computed(() => fn(strVal))
  }

  const isValidationChecked = (validationType: string) => {
    if (!hasField.value) return false
    const validationStr = validationString.value
    if (!validationStr) return false
    const validations = validationStr.split('|')
    return validations.some((validation: string) => {
      if (validation === validationType) return true
      const [type] = validation.split(':')
      return type === validationType
    })
  }

  const getParameterizedValidation = (validationType: string) => {
    if (!validationString.value) return ''
    const validations = validationString.value.split('|')
    const validation = validations.find((item: string) => item.startsWith(`${validationType}`))
    if (!validation) return ''
    return validation.replace(`${validationType}:`, '')
  }

  const createValidationValue = (validationType: string, active: boolean = true) => {
    return computed({
      get: () => getParameterizedValidation(validationType),
      set: (value: string) => {
        updateValidationString(`${validationType}:${value}`, active)
      },
    })
  }

  const createValidationMessageValue = (validationType: string) => {
    return computed<string>({
      get: () => {
        const msgs = selectedNode.value?.rules?.validationMessages
        if (!msgs || typeof msgs !== 'object') return ''
        const v = (msgs as any)[validationType]
        if (v === null || v === undefined) return ''
        return String(v)
      },
      set: (value: string) => {
        const prev = selectedNode.value?.rules?.validationMessages
        const next: Record<string, unknown> =
          prev && typeof prev === 'object' ? { ...(prev as Record<string, unknown>) } : {}
        const trimmed = value.trim()
        if (!trimmed) delete next[validationType]
        else next[validationType] = trimmed
        setNodePartial({
          rules: {
            ...selectedNode.value?.rules,
            validationMessages: Object.keys(next).length ? (next as Record<string, string>) : undefined,
          },
        })
      },
    })
  }

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
    help,
    fieldValue,
    span,
    rowSpan,
    rules,
    visibleIf,
    disabledIf,
    availableFieldNames,
    rawProps,
    rawPropsJson,
    createPropsProp,
    createButtonProp,
    optionsRaw,
    modelValue,
    min,
    max,
    whichNumber,
    numOfFiles,
    validationString,
    validationStringLength,
    updateValidationString,
    isActive,
    isValidationChecked,
    createValidationValue,
    createValidationMessageValue,
  }
}
