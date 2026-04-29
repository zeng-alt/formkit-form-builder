<script setup lang="ts">
import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import { FormKit, FormKitSchema } from '@formkit/vue'
import type { FormDslDocument } from '@/dsl/types'
import { dslToFormKitSchema } from '@/dsl/compiler'

type ModelValue = Record<string, unknown>

const props = withDefaults(
  defineProps<{
    dsl: FormDslDocument
    modelValue?: ModelValue
    actions?: boolean
    formClass?: string
    formName?: string
    labelPosition?: 'top' | 'left'
    labelWidth?: number
    schemaLibrary?: Record<string, Component>
  }>(),
  {
    actions: false,
    formClass: 'w-full !grid !grid-cols-12 gap-x-4 gap-y-2',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: ModelValue): void
  (e: 'submit', value: ModelValue): void
}>()

const safeClone = <T,>(value: T): T => {
  try {
    return structuredClone(value)
  } catch {
    return JSON.parse(JSON.stringify(value)) as T
  }
}

const data = ref<ModelValue>({})

watch(
  () => props.modelValue,
  (next) => {
    if (!next) return
    if (next === data.value) return
    data.value = safeClone(next)
  },
  { immediate: true, deep: true },
)

watch(
  data,
  (next) => {
    emit('update:modelValue', next)
  },
  { deep: true },
)

const schemaLibrary = computed<Record<string, Component>>(() => {
  return props.schemaLibrary ?? {}
})

const resolvedFormName = computed(() => {
  const fromDsl = props.dsl?.formName
  if (typeof fromDsl === 'string' && fromDsl.trim()) return fromDsl
  const fromProps = props.formName
  if (typeof fromProps === 'string' && fromProps.trim()) return fromProps
  return undefined
})

const resolvedLabelPosition = computed<'top' | 'left'>(() => {
  const fromDsl = props.dsl?.meta?.labelPosition
  if (fromDsl === 'left' || fromDsl === 'top') return fromDsl
  return props.labelPosition === 'left' ? 'left' : 'top'
})

const resolvedLabelWidth = computed<number>(() => {
  const fromDsl = Number(props.dsl?.meta?.labelWidth)
  if (Number.isFinite(fromDsl)) return fromDsl
  const fromProps = Number(props.labelWidth)
  if (Number.isFinite(fromProps)) return fromProps
  return 80
})

const resolvedFormClass = computed(() => {
  const base = props.formClass
  const common = [
    '[&_.formkit-label]:text-xs',
    '[&_.formkit-label]:font-bold',
  ].join(' ')
  if (resolvedLabelPosition.value === 'left') {
    return [
      base,
      common,
      'fk-label-left',
      '[&_.formkit-wrapper]:flex',
      '[&_.formkit-wrapper]:flex-row',
      '[&_.formkit-wrapper]:items-start',
      '[&_.formkit-wrapper]:gap-3',
      '[&_.formkit-label]:mb-0',
      '[&_.formkit-label]:w-[var(--fk-label-width)]',
      '[&_.formkit-label]:shrink-0',
      '[&_.formkit-label]:pt-1',
      '[&_.formkit-inner]:flex-1',
      '[&_.formkit-inner]:min-w-0',
    ].join(' ')
  }
  return [base, common].join(' ')
})

const compiledSchema = computed<FormKitSchemaFormKit[]>(() => {
  return dslToFormKitSchema(props.dsl.nodes ?? [], data.value)
})

const handleSubmit = (formData: Record<string, unknown>) => {
  emit('submit', formData)
}
</script>

<template>
  <FormKit
    type="form"
    :name="resolvedFormName"
    :actions="props.actions"
    v-model="data"
    @submit="handleSubmit"
    :form-class="resolvedFormClass"
    :style="{ '--fk-label-width': `${resolvedLabelWidth}px` }"
  >
    <FormKitSchema :schema="compiledSchema" :data="data" :library="schemaLibrary" />
  </FormKit>
</template>
