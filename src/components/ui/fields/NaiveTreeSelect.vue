<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NTreeSelect } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

type TreeSelectSize = 'small' | 'medium' | 'large'

const size = computed<TreeSelectSize>(() => {
  const raw = uiProps.value.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})
const clearable = computed<boolean>(() => (uiProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((uiProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)
const bordered = computed<boolean>(() => (uiProps.value.bordered as boolean | undefined) ?? true)
const filterable = computed<boolean>(
  () => (uiProps.value.filterable as boolean | undefined) ?? false,
)
const multiple = computed<boolean>(() => (uiProps.value.multiple as boolean | undefined) ?? false)
const placeholder = computed(() => props.context.placeholder as string | undefined)

const options = computed(() => {
  const raw = props.context.options as unknown
  if (!Array.isArray(raw)) return []
  return raw
    .map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        const key = opt
        return { label: String(opt), key }
      }
      if (opt && typeof opt === 'object') return opt
      return null
    })
    .filter((v): v is Record<string, unknown> => v !== null)
})

const value = computed<any>(() => {
  const raw = props.context._value as unknown
  if (raw === undefined || raw === null || raw === '') return multiple.value ? [] : null
  return raw
})

function handleUpdateValue(next: unknown) {
  props.context.node.input(next)
}
</script>

<template>
  <NTreeSelect
    :value="value"
    :options="options"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :filterable="filterable"
    :multiple="multiple"
    :placeholder="placeholder"
    :input-props="{ id: context.id }"
    :bordered="bordered"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
