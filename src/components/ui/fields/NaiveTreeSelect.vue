<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NTreeSelect } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useDynamicTreeOptions } from '../formkit/use-dynamic-tree-options'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config, props, bind } = useSchemaAttrs(context)
const { runEvent } = useBindEvents(context, bind)
// multiple 供 value 计算（决定空值形状）使用；透传给 NTreeSelect 的仍是 props.multiple
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
        const key = opt
        return { label: String(opt), key }
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

async function handleUpdateValue(next: unknown) {
  context.node.input(next)
  await runEvent('onInput', next)
  await runEvent('onChange', next)
}

const handleFocus = async (e: FocusEvent) => {
  await runEvent('onFocus', e)
}

const handleBlur = async (e: FocusEvent) => {
  await runEvent('onBlur', e)
  context.handlers.blur(e)
}
</script>

<template>
  <NTreeSelect
    v-bind="props"
    :value="value"
    :options="options"
    :input-props="{ id: context.id }"
    @update:value="handleUpdateValue"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>
