<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { SelectOption, SelectProps } from 'naive-ui'
import { NSelect } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useDynamicOptions } from '../formkit/use-dynamic-options'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

const size = computed<SelectProps['size']>(() => (config.size as SelectProps['size']) ?? 'medium')
const clearable = computed<boolean>(() => (config.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))
// multiple 供 value 计算（决定单值/数组）使用；透传给 NSelect 的仍是 props.multiple
const multiple = computed<boolean>(() => (config.multiple as boolean | undefined) ?? false)

type Primitive = string | number
type SelectValue = Primitive | Primitive[] | null

const optionsRaw = computed(() => props.value.options as unknown)

// 动态字典：options = { dynamic:true, code, label? } → fetchDictionary(code)
const { isDynamic, dynamicOptions } = useDynamicOptions(optionsRaw)

const options = computed<SelectOption[]>(() => {
  if (isDynamic.value) return dynamicOptions.value
  const raw = optionsRaw.value
  if (!Array.isArray(raw)) return []
  return raw.reduce<SelectOption[]>((acc, opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      acc.push({ label: String(opt), value: opt })
      return acc
    }
    if (opt && typeof opt === 'object') {
      const value = (opt as Record<string, unknown>).value
      const label = (opt as Record<string, unknown>).label
      if (typeof value === 'string' || typeof value === 'number') {
        acc.push({ label: String(label ?? value), value })
      }
    }
    return acc
  }, [])
})

const value = computed<SelectValue>(() => {
  const raw = context._value as unknown
  if (multiple.value) {
    if (Array.isArray(raw))
      return raw.filter((v): v is Primitive => typeof v === 'string' || typeof v === 'number')
    if (typeof raw === 'string' || typeof raw === 'number') return [raw]
    return []
  }
  if (typeof raw === 'string' || typeof raw === 'number') return raw
  if (Array.isArray(raw)) {
    const first = raw.find((v) => typeof v === 'string' || typeof v === 'number')
    return (first as Primitive | undefined) ?? null
  }
  return null
})

function handleUpdateValue(next: SelectValue) {
  context.node.input(next)
}
</script>

<template>
  <NSelect
    v-bind="props"
    :value="value"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :options="options"
    :input-props="{ id: context.id }"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
