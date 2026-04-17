import type { FormKitSchemaFormKit } from '@formkit/core'
import type { WritableComputedRef } from 'vue'
import { computed, ref } from 'vue'
import { formSchema, selectedIndex } from '../utils/default-form-elements'
import { commitSchema } from './schema-history'

export const isLoading = ref(false)
export const selectedField = computed(() => formSchema.value[selectedIndex.value])

export type CanvasView = 'desktop' | 'tablet' | 'mobile'
export const canvasView = ref<CanvasView>('desktop')

type SchemaWithButtonProps = FormKitSchemaFormKit & {
  buttonProps?: Record<string, unknown>
}

type SchemaWithNaiveProps = FormKitSchemaFormKit & {
  naiveProps?: Record<string, unknown>
}

export function useFormField() {
  const normalizeName = (value: string) => {
    let name = value.trim().replace(/[^a-zA-Z0-9_]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
    if (!name) return ''
    if (/^\d/.test(name)) name = `field_${name}`
    return name
  }

  const setFieldProp = (key: string, value: unknown) => {
    if (formSchema.value.length > 0) {
      const updatedSchema = [...formSchema.value]
      const current = { ...(updatedSchema[selectedIndex.value] as Record<string, unknown>) }
      if (value === undefined) {
        delete (current as any)[key]
      } else {
        ;(current as any)[key] = value
      }
      updatedSchema[selectedIndex.value] = current as FormKitSchemaFormKit
      commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
    }
  }

  const setButtonProp = (key: string, value: unknown) => {
    if (formSchema.value.length > 0) {
      const updatedSchema = [...formSchema.value]
      const current = updatedSchema[selectedIndex.value] as SchemaWithButtonProps
      const nextButtonProps = {
        ...current?.buttonProps,
        [key]: value,
      }
      updatedSchema[selectedIndex.value] = {
        ...current,
        buttonProps: nextButtonProps,
      } as FormKitSchemaFormKit
      commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
    }
  }

  const setNaiveProp = (key: string, value: unknown) => {
    if (formSchema.value.length > 0) {
      const updatedSchema = [...formSchema.value]
      const current = updatedSchema[selectedIndex.value] as SchemaWithNaiveProps
      const nextNaiveProps = {
        ...current?.naiveProps,
        [key]: value,
      }
      updatedSchema[selectedIndex.value] = {
        ...current,
        naiveProps: nextNaiveProps,
      } as FormKitSchemaFormKit
      commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
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

  const createNaiveProp = <T>(key: string, defaultValue: T): WritableComputedRef<T, T> => {
    return computed({
      get: () => {
        const current = selectedField.value as SchemaWithNaiveProps
        const value = current?.naiveProps?.[key]
        return (value ?? defaultValue) as T
      },
      set: (value: T) => setNaiveProp(key, value),
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

  const label = computed({
    get: () => selectedField.value?.label || '',
    set: (newLabel: string) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          label: newLabel,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
    },
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
    get: () => selectedField.value?.placeholder || '',
    set: (newPlaceholder: string) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          placeholder: newPlaceholder,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
    },
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
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          validation: value,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
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
    get: () => selectedField.value?.help || '',
    set: (newHelp: string) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          help: newHelp,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
    },
  })

  const whichNumber = computed<string>({
    get: () => selectedField.value?.number || 'integer',
    set: (value: string) => {
      if (value === 'integer') {
        if (formSchema.value.length > 0) {
          const updatedSchema = [...formSchema.value]
          updatedSchema[selectedIndex.value] = {
            ...updatedSchema[selectedIndex.value],
            number: value,
            step: '1',
          } as FormKitSchemaFormKit
          commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
        }
      } else {
        if (formSchema.value.length > 0) {
          const updatedSchema = [...formSchema.value]
          updatedSchema[selectedIndex.value] = {
            ...updatedSchema[selectedIndex.value],
            number: value,
            step: '0.1',
          } as FormKitSchemaFormKit
          commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
        }
      }
    },
  })

  const numOfFiles = computed({
    get: () => selectedField.value?.multiple || 'false',
    set: (value: string) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          multiple: value,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
    },
  })

  const modelValue = computed<string[]>({
    get: () => selectedField.value?.options || [],
    set: (newOptions: string[]) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          options: newOptions,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
    },
  })

  const optionsRaw = computed<unknown>({
    get: () => selectedField.value?.options ?? [],
    set: (newOptions: unknown) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          options: newOptions,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
    },
  })

  const min = computed<number | undefined>({
    get: () => selectedField.value?.min,
    set: (newMin: number | undefined) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          min: newMin,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
    },
  })

  const max = computed<number | undefined>({
    get: () => selectedField.value?.max,
    set: (newMax: number | undefined) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          max: newMax,
        } as FormKitSchemaFormKit
        commitSchema(updatedSchema, { reason: 'field-edit', merge: true })
      }
    },
  })

  const hasField = computed(() => !!formSchema.value[selectedIndex.value])

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

  const currentFieldType = computed(() => (hasField.value ? selectedField.value?.$formkit : null))

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

  return {
    fieldName,
    useExpressionValue,
    valueExpression,
    label,
    buttonText,
    placeholder,
    fieldValue,
    updateValidationString,
    isActive,
    createValidationValue,
    validationStringLength,
    currentFieldType,
    availableFieldNames,
    hasField,
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
    createNaiveProp,
  }
}
