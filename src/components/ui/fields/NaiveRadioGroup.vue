<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NRadio, NRadioGroup } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useDynamicOptions } from '../formkit/use-dynamic-options'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// horizontal 是布局键（wrapper class），不是 NRadioGroup 属性
const { config, props } = useSchemaAttrs(context, { omit: ['horizontal'] })

const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))
const horizontal = computed<boolean>(() => (config.horizontal as boolean | undefined) ?? false)

const optionsRaw = computed(() => props.value.options as unknown)

// 动态字典：options = { dynamic:true, code, label? } → fetchDictionary(code)
const { isDynamic, dynamicOptions } = useDynamicOptions(optionsRaw)

const options = computed(() => {
  if (isDynamic.value) return dynamicOptions.value
  const raw = optionsRaw.value
  if (!Array.isArray(raw)) return []
  return raw
    .map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { label: String(opt), value: opt }
      }
      if (opt && typeof opt === 'object') {
        const value = (opt as Record<string, unknown>).value
        const label = (opt as Record<string, unknown>).label
        if (value !== undefined) return { label: String(label ?? value), value }
      }
      return null
    })
    .filter((v): v is { label: string; value: string | number } => v !== null)
})

const value = computed(() => context._value as string | number | null | undefined)

function handleUpdateValue(next: string | number) {
  context.node.input(next)
}
</script>

<template>
  <NRadioGroup
    v-bind="props"
    :value="value"
    :disabled="disabled"
    @update:value="handleUpdateValue"
  >
    <div
      :class="
        horizontal ? 'flex flex-row flex-wrap gap-4 w-full py-1' : 'flex flex-col gap-2 w-full py-1'
      "
    >
      <NRadio v-for="opt in options" :key="String(opt.value)" :value="opt.value">
        {{ opt.label }}
      </NRadio>
    </div>
  </NRadioGroup>
</template>
