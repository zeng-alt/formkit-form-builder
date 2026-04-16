<!-- src/components/form-builder/BuilderPreview.vue -->
<template>
  <n-modal
    v-model:show="isOpen"
    preset="card"
    :class="[
      'max-h-[90vh] overflow-y-auto border-none transition-all duration-300',
      canvasView === 'desktop' ? 'sm:max-w-[800px]' : '',
      canvasView === 'tablet' ? 'sm:max-w-[768px]' : '',
      canvasView === 'mobile' ? 'sm:max-w-[375px]' : ''
    ]"
    title="Form Preview"
    size="small"
  >
    <template #header-extra>
      <div class="text-[11px] text-muted-foreground">
        Preview your form and test its functionality.
      </div>
    </template>
    <div class="py-4 px-3">
      <FormKit
        type="form"
        :actions="false"
        v-model="data"
        @submit="handleSubmit"
        form-class="w-full !grid !grid-cols-12 gap-x-4 gap-y-2"
      >
        <FormKitSchema :schema="formattedSchema" :data="data" />
      </FormKit>
      <div class="mt-4 p-3 bg-muted/30 rounded border border-border/50">
        <h3 class="text-[11px] font-medium mb-2 text-foreground/80">Form Data:</h3>

        <pre class="text-[11px] text-muted-foreground">{{ JSON.stringify(data, null, 2) }}</pre>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { provide, ref, watchEffect } from 'vue'
import { NModal } from 'naive-ui'
import { formSchema } from '../utils/default-form-elements'
import createFormattedSchema from '../utils/format-schema'
import { canvasView } from '../composables/form-fields'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { evalExpression } from '../utils/expression-eval'

const isOpen = ref(false)
const data = ref({})
const formattedSchema = createFormattedSchema(formSchema)

provide('isPreviewOpen', isOpen)
const lastComputedValueByName = ref<Record<string, string>>({})
const lastDepsSigByName = ref<Record<string, string>>({})

const eachField = (schema: FormKitSchemaFormKit[], fn: (field: any) => void) => {
  for (const field of schema) {
    fn(field)
    const children = (field as any)?.children
    if (Array.isArray(children)) eachField(children as FormKitSchemaFormKit[], fn)
  }
}

watchEffect(() => {
  const currentData = data.value as Record<string, unknown>
  let nextData: Record<string, unknown> | null = null
  eachField(formSchema.value as FormKitSchemaFormKit[], (field) => {
    if (!field || typeof field !== 'object') return
    if (!field.useExpressionValue) return
    if (typeof field.name !== 'string' || !field.name) return
    if (typeof field.valueExpression !== 'string' || !field.valueExpression.trim()) return

    const evalResult = evalExpression(field.valueExpression, currentData)
    const depsSig = evalResult.deps
      .filter((k) => k !== field.name)
      .map((k) => `${k}:${String(currentData[k] ?? '')}`)
      .join('|')
    if (lastDepsSigByName.value[field.name] === depsSig) return
    lastDepsSigByName.value = { ...lastDepsSigByName.value, [field.name]: depsSig }

    if (!evalResult.ok) return
    const result = evalResult.value === null || evalResult.value === undefined ? '' : String(evalResult.value)

    const currentValue = currentData[field.name]
    const lastComputedValue = lastComputedValueByName.value[field.name]
    const shouldApply =
      currentValue === null ||
      currentValue === undefined ||
      String(currentValue) === '' ||
      (lastComputedValue !== undefined && String(currentValue) === lastComputedValue)

    if (shouldApply && String(currentValue ?? '') !== result) {
      if (!nextData) nextData = { ...currentData }
      nextData[field.name] = result
      lastComputedValueByName.value = { ...lastComputedValueByName.value, [field.name]: result }
    }
  })

  if (nextData) data.value = nextData
})

const handleSubmit = async (formData: Record<string, unknown>) => {
  console.log('Form submitted:', formData)
  await new Promise((r) => setTimeout(r, 1000))
  alert('Form submitted!')
  data.value = {}
}

const open = () => {
  isOpen.value = true
  data.value = {}
  lastComputedValueByName.value = {}
  lastDepsSigByName.value = {}
}

const close = () => {
  isOpen.value = false
  data.value = {}
  lastComputedValueByName.value = {}
  lastDepsSigByName.value = {}
}

defineExpose({
  open,
  close,
})
</script>
