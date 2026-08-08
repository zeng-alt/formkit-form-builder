<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NCascader } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useDynamicTreeOptions } from '../formkit/use-dynamic-tree-options'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props } = useSchemaAttrs(context)

type CascaderSize = 'small' | 'medium' | 'large'

const size = computed<CascaderSize>(() => {
  const raw = config.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})

// multiple 供 value 计算（决定空值形状）使用；透传给 NCascader 的仍是 props.multiple
const multiple = computed<boolean>(() => (config.multiple as boolean | undefined) ?? false)

const optionsRaw = computed(() => props.value.options as unknown)

const { isDynamic, dynamicOptions } = useDynamicTreeOptions(optionsRaw)

const options = computed(() => {
  if (isDynamic.value) return dynamicOptions.value
  const raw = optionsRaw.value
  if (!Array.isArray(raw)) return []
  return raw
    .map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { label: String(opt), value: opt }
      }
      if (opt && typeof opt === 'object') return opt
      return null
    })
    .filter((v): v is Record<string, unknown> => v !== null)
})

const value = computed<any>(() => {
  const raw = context._value as unknown
  if (raw === undefined || raw === null || raw === '') return multiple.value ? [] : null
  return raw
})

function handleUpdateValue(next: unknown) {
  context.node.input(next)
}
</script>

<template>
  <NCascader
    v-bind="props"
    :value="value"
    :options="options"
    :size="size"
    :input-props="{ id: context.id }"
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
  />
</template>
