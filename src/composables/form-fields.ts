import type { FormKitSchemaFormKit } from '@formkit/core'
import type { WritableComputedRef } from 'vue'
import { computed, ref } from 'vue'
import { formSchema, selectedIndex } from '../utils/default-form-elements'

export const isLoading = ref(false)
export const selectedField = computed(() => formSchema.value[selectedIndex.value])

export type CanvasView = 'desktop' | 'tablet' | 'mobile'
export const canvasView = ref<CanvasView>('desktop')

export function useFormField() {
  const createValidationValue = (validationType: string, active: boolean = true) => {
    return computed({
      get: () => getParameterizedValidation(validationType),
      set: (value: string) => {
        updateValidationString(`${validationType}:${value}`, active)
      },
    })
  }

  const label = computed({
    get: () => selectedField.value?.label || '',
    set: (newLabel: string) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          label: newLabel,
        } as FormKitSchemaFormKit
        formSchema.value = updatedSchema
      }
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
        formSchema.value = updatedSchema
      }
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
        formSchema.value = updatedSchema
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
        formSchema.value = updatedSchema
      }
    },
  })

  const whichNumber: WritableComputedRef<any, string> = computed({
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
          formSchema.value = updatedSchema
        }
      } else {
        if (formSchema.value.length > 0) {
          const updatedSchema = [...formSchema.value]
          updatedSchema[selectedIndex.value] = {
            ...updatedSchema[selectedIndex.value],
            number: value,
            step: '0.1',
          } as FormKitSchemaFormKit
          formSchema.value = updatedSchema
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
        formSchema.value = updatedSchema
      }
    },
  })

  const modelValue: WritableComputedRef<any, string[]> = computed({
    get: () => selectedField.value?.options || [],
    set: (newOptions: string[]) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          options: newOptions,
        } as FormKitSchemaFormKit
        formSchema.value = updatedSchema
      }
    },
  })

  const min: WritableComputedRef<any, number> = computed({
    get: () => selectedField.value?.min,
    set: (newMin: number) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          min: newMin,
        } as FormKitSchemaFormKit
        formSchema.value = updatedSchema
      }
    },
  })

  const max = computed({
    get: () => selectedField.value?.max,
    set: (newMax: number) => {
      if (formSchema.value.length > 0) {
        const updatedSchema = [...formSchema.value]
        updatedSchema[selectedIndex.value] = {
          ...updatedSchema[selectedIndex.value],
          max: newMax,
        } as FormKitSchemaFormKit
        formSchema.value = updatedSchema
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

  return {
    label,
    placeholder,
    updateValidationString,
    isActive,
    createValidationValue,
    validationStringLength,
    currentFieldType,
    hasField,
    help,
    whichNumber,
    validationString,
    numOfFiles,
    modelValue,
    min,
    max,
    isValidationChecked,
  }
}
