import { computed, type Ref } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'

export default function createFormattedSchema(fields: Ref<FormKitSchemaFormKit[]> | undefined) {
  return computed(() => {
    if (!fields) return []
    // Transform fields to remove unwanted elements and update IDs
    return fields?.value.map((field, index) => {
      const key = (field as any)?.__key as string | undefined
      const {
        $formkit,
        label,
        validation,
        help,
        placeholder,
        value,
        options,
        number,
        outerClass,
        type,
        buttonProps,
        naiveProps,
        min,
        max,
        validationVisibility,
        __raw__sectionsSchema,
        step,
        multiple,
        accept,
      } = field

      // Create a clean field object with only necessary properties
      const cleanField: FormKitSchemaFormKit = {
        $formkit,
        name: field.name || (key ? `field_${key}` : `field_${index}`),
        id: field.id || (key ? `preview_field_${key}` : `preview_field_${index}`),
        label,
        validation,
        help,
        placeholder,
        value,
        options,
        outerClass,
        type,
        buttonProps,
        naiveProps,
        number,
        min,
        max,
        validationVisibility,
        __raw__sectionsSchema,
        step,
        multiple,
        accept,
      }

      // Add options if they exist (for select, radio, etc.)
      if (options) {
        cleanField.options = options
      }

      return cleanField
    })
  })
}
