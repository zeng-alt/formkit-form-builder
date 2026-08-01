import type { FormKitSchemaFormKit } from '@formkit/core'
import type { WritableComputedRef } from 'vue'
import { computed } from 'vue'
import {
  formMeta,
  formSchema,
  selectedIndex,
  selectedKey,
  selectedTarget,
} from '@/state/form-schema'
import { formDefinition } from '@/state/form-definition'
import { findNodeByKey, getNodeAtPath } from '@/utils/schema/tree'
import { findDslNodeByKey, updateDslNodeAtKey } from '@/utils/schema/dsl-tree'
import { commitFormDefinition } from './schema-history'
import { schemaNodeToDslNode } from '@/dsl'
import type { FormNode } from '@/types/dsl'

export const selectedField = computed(() => {
  const key = selectedKey.value
  if (key) {
    const found = findNodeByKey(formSchema.value as unknown[], key)
    if (found) return found.node
  }
  return formSchema.value[selectedIndex.value]
})

type SchemaWithButtonProps = FormKitSchemaFormKit & {
  buttonProps?: Record<string, unknown>
}

const toDslNode = (patchedNode: FormKitSchemaFormKit, key?: string | null): FormNode => {
  const converted = schemaNodeToDslNode(patchedNode)
  const existing = key ? findDslNodeByKey(formDefinition.value.root.children, key)?.node : undefined
  const next: Record<string, unknown> = { ...converted }
  if (existing?.id) next.id = existing.id
  if (existing?.key) next.key = existing.key
  if (
    (existing?.category === 'container' || existing?.category === 'layout') &&
    Array.isArray(existing.children)
  ) {
    next.children = existing.children
  }
  return next as unknown as FormNode
}

const commitNodePatch = (patchedNode: FormKitSchemaFormKit) => {
  const def = formDefinition.value
  const root = Array.isArray(def?.root?.children) ? def.root.children : []
  const key =
    selectedKey.value ??
    (patchedNode as any)?.__key ??
    root[selectedIndex.value]?.key ??
    root[selectedIndex.value]?.id
  if (key) {
    const { nodes: nextRoot, found } = updateDslNodeAtKey(root, key, toDslNode(patchedNode, key))
    if (found) {
      commitFormDefinition(
        { ...def, root: { ...def.root, children: nextRoot } },
        { reason: 'field-edit', merge: true },
      )
      return
    }
  }
  if (root[selectedIndex.value]) {
    const nextRoot = root.map((n, i) =>
      i === selectedIndex.value ? toDslNode(patchedNode, n?.key ?? n?.id) : n,
    )
    commitFormDefinition(
      { ...def, root: { ...def.root, children: nextRoot } },
      { reason: 'field-edit', merge: true },
    )
  }
}

export function useFormField() {
  const normalizeName = (value: string) => {
    let name = value
      .trim()
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
    if (!name) return ''
    if (/^\d/.test(name)) name = `field_${name}`
    return name
  }

  const setFieldProp = (key: string, value: unknown) => {
    if (formSchema.value.length > 0) {
      const selected = selectedKey.value
      const found = selected ? findNodeByKey(formSchema.value as any[], selected) : null
      const path = found?.path
      const currentNode = path
        ? getNodeAtPath(formSchema.value as any[], path)
        : formSchema.value[selectedIndex.value]
      if (!currentNode) return

      const current = { ...(currentNode as Record<string, unknown>) }
      const isCmp = typeof (current as any)?.$cmp === 'string' && Boolean((current as any)?.$cmp)
      const propKeys = new Set([
        'label',
        'help',
        'placeholder',
        'bordered',
        'embedded',
        'hoverable',
        'size',
      ])
      if (isCmp && propKeys.has(key)) {
        const nextProps: any = { ...(((current as any).props ?? {}) as any) }
        if (value === undefined) delete nextProps[key]
        else nextProps[key] = value
        ;(current as any).props = Object.keys(nextProps).length ? nextProps : undefined
      } else if (value === undefined) {
        delete (current as any)[key]
      } else {
        ;(current as any)[key] = value
      }
      commitNodePatch(current as FormKitSchemaFormKit)
    }
  }

  const setButtonProp = (key: string, value: unknown) => {
    if (formSchema.value.length > 0) {
      const selected = selectedKey.value
      const found = selected ? findNodeByKey(formSchema.value as any[], selected) : null
      const path = found?.path
      const current = (
        path
          ? getNodeAtPath(formSchema.value as any[], path)
          : formSchema.value[selectedIndex.value]
      ) as SchemaWithButtonProps
      if (!current) return
      const nextButtonProps = {
        ...current?.buttonProps,
        [key]: value,
      }
      const nextNode = {
        ...current,
        buttonProps: nextButtonProps,
      } as FormKitSchemaFormKit
      commitNodePatch(nextNode)
    }
  }

  const setPropsProp = (key: string, value: unknown) => {
    if (formSchema.value.length > 0) {
      const selected = selectedKey.value
      const found = selected ? findNodeByKey(formSchema.value as any[], selected) : null
      const path = found?.path
      const current = (
        path
          ? getNodeAtPath(formSchema.value as any[], path)
          : formSchema.value[selectedIndex.value]
      ) as any
      if (!current) return
      const nextProps: any = { ...(((current as any).props ?? {}) as any) }
      if (value === undefined) delete nextProps[key]
      else nextProps[key] = value
      const nextNode: any = {
        ...current,
        props: Object.keys(nextProps).length ? nextProps : undefined,
      }
      commitNodePatch(nextNode)
    }
  }

  const createButtonProp = <T>(key: string, defaultValue: T): WritableComputedRef<T, T> => {
    return computed({
      get: () => {
        const current = selectedField.value as SchemaWithButtonProps
        const value = current?.buttonProps?.[key]
        return (value ?? defaultValue) as T
      },
      set: (value: T) => setButtonProp(key, value),
    })
  }

  const createPropsProp = <T>(key: string, defaultValue: T): WritableComputedRef<T, T> => {
    return computed({
      get: () => {
        const current: any = selectedField.value as any
        const value = current?.props?.[key]
        return (value ?? defaultValue) as T
      },
      set: (value: T) => setPropsProp(key, value),
    })
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
        const current: any = selectedField.value as any
        const msgs = current?.validationMessages
        if (!msgs || typeof msgs !== 'object') return ''
        const v = (msgs as any)[validationType]
        if (v === null || v === undefined) return ''
        return String(v)
      },
      set: (value: string) => {
        const current: any = selectedField.value as any
        const prev = current?.validationMessages
        const next: Record<string, unknown> =
          prev && typeof prev === 'object' ? { ...(prev as Record<string, unknown>) } : {}
        const trimmed = value.trim()
        if (!trimmed) delete next[validationType]
        else next[validationType] = trimmed
        setFieldProp('validationMessages', Object.keys(next).length ? next : undefined)
      },
    })
  }

  const fieldName = computed({
    get: () => selectedField.value?.name || '',
    set: (newName: string) => {
      const nextName = normalizeName(newName)
      setFieldProp('name', nextName || undefined)
    },
  })

  const useExpressionValue = computed({
    get: () => {
      const current = selectedField.value as any
      return Boolean(current?.useExpressionValue)
    },
    set: (value: boolean) => setFieldProp('useExpressionValue', value ? true : undefined),
  })

  const valueExpression = computed<string>({
    get: () => {
      const current = selectedField.value as any
      const value = current?.__raw__valueExpression ?? current?.valueExpression
      if (typeof value !== 'string') return ''
      return value
    },
    set: (value: string) => {
      setFieldProp('__raw__valueExpression', value.trim() ? value : undefined)
      setFieldProp('valueExpression', undefined)
    },
  })

  const ifExpression = computed<string>({
    get: () => {
      const current = selectedField.value as any
      const raw = current?.__raw__ifExpression ?? current?.if
      if (typeof raw !== 'string') return ''
      return raw
    },
    set: (value: string) => {
      const next = value.trim()
      setFieldProp('__raw__ifExpression', next ? next : undefined)
      setFieldProp('if', next ? next : undefined)
    },
  })

  const label = computed({
    get: () => {
      const current: any = selectedField.value as any
      if (typeof current?.$cmp === 'string' && current.$cmp)
        return String(current?.props?.label ?? '')
      return (selectedField.value as any)?.label || ''
    },
    set: (newLabel: string) => setFieldProp('label', newLabel),
  })

  const buttonText = computed<string>({
    get: () => {
      const current = selectedField.value as any
      const value = current?.buttonText
      if (typeof value !== 'string') return ''
      return value
    },
    set: (value: string) => {
      const next = value.trim()
      setFieldProp('buttonText', next ? next : undefined)
    },
  })

  const placeholder = computed({
    get: () => {
      const current: any = selectedField.value as any
      if (typeof current?.$cmp === 'string' && current.$cmp)
        return String(current?.props?.placeholder ?? '')
      return (selectedField.value as any)?.placeholder || ''
    },
    set: (newPlaceholder: string) => setFieldProp('placeholder', newPlaceholder),
  })

  const fieldValue = computed<string>({
    get: () => {
      const current = selectedField.value as unknown as { value?: unknown }
      const value = current?.value
      if (value === null || value === undefined) return ''
      return String(value)
    },
    set: (newValue: string) => {
      setFieldProp('value', newValue === '' ? undefined : newValue)
    },
  })

  const validationString = computed({
    get: () => selectedField.value?.validation || '',
    set: (value: string) => {
      const next = value.trim()
      setFieldProp('validation', next ? next : undefined)
    },
  })

  const validationStringLength = computed(() => {
    if (!validationString.value) return 0
    const validation = selectedField.value?.validation
    if (typeof validation !== 'string') return 0
    return validation.split('|').length
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
    } else {
      const [validationType, validationValue] = value.split(':')
      if (currentValidation.includes(value) && !active) {
        newValidation = currentValidation.filter((item: string) => item !== value)
      } else {
        const indexOfType = currentValidation.findIndex((item: string) =>
          item.startsWith(`${validationType}:`),
        )
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
      return
    }
  }

  const isActive = (fn: (arg0: string) => boolean, strVal: string) => {
    return computed(() => fn(strVal))
  }

  const getParameterizedValidation = (validationType: string) => {
    if (!validationString.value) return ''

    const validations = validationString.value.split('|')
    const validation = validations.find((item: string) => item.startsWith(`${validationType}`))

    if (!validation) return ''

    return validation.replace(`${validationType}:`, '')
  }

  const help = computed({
    get: () => {
      const current: any = selectedField.value as any
      if (typeof current?.$cmp === 'string' && current.$cmp)
        return String(current?.props?.help ?? '')
      return (selectedField.value as any)?.help || ''
    },
    set: (newHelp: string) => setFieldProp('help', newHelp),
  })

  const whichNumber = computed<string>({
    get: () => selectedField.value?.number || 'integer',
    set: (value: string) => {
      const current = selectedField.value
      if (!current) return
      commitNodePatch({
        ...current,
        number: value,
        step: value === 'integer' ? '1' : '0.1',
      } as FormKitSchemaFormKit)
    },
  })

  const numOfFiles = computed({
    get: () => selectedField.value?.multiple || 'false',
    set: (value: string) => {
      const current = selectedField.value
      if (!current) return
      commitNodePatch({ ...current, multiple: value } as FormKitSchemaFormKit)
    },
  })

  const modelValue = computed<string[]>({
    get: () => selectedField.value?.options || [],
    set: (newOptions: string[]) => {
      const current = selectedField.value
      if (!current) return
      commitNodePatch({ ...current, options: newOptions } as FormKitSchemaFormKit)
    },
  })

  const optionsRaw = computed<unknown>({
    get: () => selectedField.value?.options ?? [],
    set: (newOptions: unknown) => {
      const current = selectedField.value
      if (!current) return
      commitNodePatch({ ...current, options: newOptions } as FormKitSchemaFormKit)
    },
  })

  const min = computed<number | undefined>({
    get: () => selectedField.value?.min,
    set: (newMin: number | undefined) => {
      const current = selectedField.value
      if (!current) return
      commitNodePatch({ ...current, min: newMin } as FormKitSchemaFormKit)
    },
  })

  const max = computed<number | undefined>({
    get: () => selectedField.value?.max,
    set: (newMax: number | undefined) => {
      const current = selectedField.value
      if (!current) return
      commitNodePatch({ ...current, max: newMax } as FormKitSchemaFormKit)
    },
  })

  const selectedIsForm = computed(() => selectedTarget.value === 'form')
  const hasField = computed(() => selectedIsForm.value || !!formSchema.value[selectedIndex.value])

  const isValidationChecked = (validationType: string) => {
    if (!hasField.value) return false
    const validationStr = selectedField?.value?.validation
    if (!validationStr || typeof validationStr !== 'string') return false

    const validations = validationStr.split('|')
    return validations.some((validation: string) => {
      if (validation === validationType) return true

      const [type] = validation.split(':')
      return type === validationType
    })
  }

  const currentFieldType = computed(() => {
    if (!hasField.value) return null
    if (selectedIsForm.value) return 'form'
    const current: any = selectedField.value as any
    if (typeof current?.$formkit === 'string' && current.$formkit) return current.$formkit
    if (typeof current?.$cmp === 'string' && current.$cmp) return current.$cmp
    return null
  })

  const formName = computed<string>({
    get: () => formMeta.value.name,
    set: (value: string) => {
      const next = value.trim()
      formMeta.value = { ...formMeta.value, name: next || 'form' }
    },
  })

  const formLabelPosition = computed<'top' | 'left'>({
    get: () => formMeta.value.labelPosition,
    set: (value: 'top' | 'left') => {
      formMeta.value = { ...formMeta.value, labelPosition: value }
    },
  })

  const formLabelWidth = computed<number>({
    get: () => formMeta.value.labelWidth,
    set: (value: number) => {
      const n = Number(value)
      const next = Number.isFinite(n) ? Math.max(0, Math.min(2000, Math.round(n))) : 120
      formMeta.value = { ...formMeta.value, labelWidth: next }
    },
  })

  const availableFieldNames = computed(() => {
    const extractNames = (schema: FormKitSchemaFormKit[]): string[] => {
      let names: string[] = []
      for (const field of schema) {
        if (field.name && typeof field.name === 'string') {
          names.push(field.name)
        }
        if (field.children && Array.isArray(field.children)) {
          names = names.concat(extractNames(field.children as FormKitSchemaFormKit[]))
        }
      }
      return names
    }
    return Array.from(new Set(extractNames(formSchema.value)))
  })

  const rowSpan = computed<number>({
    get: () => {
      const outerClass = selectedField.value?.outerClass
      if (typeof outerClass !== 'string') return 1
      const match = outerClass.match(/\brow-span-(\d+)\b/)
      return match ? parseInt(match[1]!, 10) : 1
    },
    set: (value: number) => {
      const nextSpan = Math.max(1, Math.min(6, Math.round(value)))
      const currentOuterClass = selectedField.value?.outerClass
      let classes = typeof currentOuterClass === 'string' ? currentOuterClass : ''

      if (nextSpan === 1) {
        classes = classes
          .replace(/\brow-span-\d+\b/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      } else if (/\brow-span-\d+\b/.test(classes)) {
        classes = classes
          .replace(/\brow-span-\d+\b/g, `row-span-${nextSpan}`)
          .replace(/\s+/g, ' ')
          .trim()
      } else {
        classes = `${classes} row-span-${nextSpan}`.replace(/\s+/g, ' ').trim()
      }

      setFieldProp('outerClass', classes || undefined)
    },
  })

  const bindEvents = computed<Record<string, unknown>>({
    get: () => {
      const current: any = selectedField.value as any
      const value = current?.__bind
      if (value && typeof value === 'object') return value as Record<string, unknown>
      const legacy = current?.bind
      if (legacy && typeof legacy === 'object') return legacy as Record<string, unknown>
      return {}
    },
    set: (value: Record<string, unknown>) => {
      const hasAny = value && typeof value === 'object' && Object.keys(value).length > 0
      setFieldProp('__bind', hasAny ? value : undefined)
      setFieldProp('bind', undefined)
    },
  })

  return {
    fieldName,
    useExpressionValue,
    valueExpression,
    ifExpression,
    label,
    buttonText,
    placeholder,
    fieldValue,
    updateValidationString,
    isActive,
    createValidationValue,
    createValidationMessageValue,
    validationStringLength,
    currentFieldType,
    availableFieldNames,
    hasField,
    selectedIsForm,
    formName,
    formLabelPosition,
    formLabelWidth,
    help,
    whichNumber,
    validationString,
    numOfFiles,
    modelValue,
    optionsRaw,
    min,
    max,
    isValidationChecked,
    createButtonProp,
    createPropsProp,
    rowSpan,
    bindEvents,
  }
}
