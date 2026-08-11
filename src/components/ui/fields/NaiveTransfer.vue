<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { TransferOption } from 'naive-ui'
import { NTransfer } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useDynamicOptions } from '../formkit/use-dynamic-options'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// filterable 是单开关配置（同时控制源/目标侧过滤）；NTransfer 的 filterable prop 已废弃，
// 因此从透传 props 中剔除，改由 source-filterable/target-filterable 显式绑定。
const { config, props, bind } = useSchemaAttrs(context, { omit: ['filterable'] })
const { runEvent } = useBindEvents(context, bind)

type OptionValue = string | number

const optionsRaw = computed(() => props.value.options as unknown)

// 动态字典：options = { dynamic:true, code, label? } → fetchDictionary(code)
const { isDynamic, dynamicOptions } = useDynamicOptions(optionsRaw)

const options = computed<TransferOption[]>(() => {
  if (isDynamic.value) return dynamicOptions.value
  const raw = optionsRaw.value
  if (!Array.isArray(raw)) return []
  return raw.reduce<TransferOption[]>((acc, opt) => {
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

const filterable = computed<boolean>(() => (config.filterable as boolean | undefined) ?? false)

const value = computed<OptionValue[]>(() => {
  const raw = context._value as unknown
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is OptionValue => typeof v === 'string' || typeof v === 'number')
})

async function handleUpdateValue(next: OptionValue[]) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}
</script>

<template>
  <NTransfer
    v-bind="props"
    :value="value"
    :options="options"
    :source-filterable="filterable"
    :target-filterable="filterable"
    @update:value="handleUpdateValue"
  />
</template>
