<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { InputProps } from 'naive-ui'
import { NInput } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'
import { createSchemaRuntimeContext, runBindCode } from '@/utils/bind-runtime'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const size = computed<InputProps['size']>(
  () => (uiProps.value.size as InputProps['size']) ?? 'medium',
)
const clearable = computed<boolean>(() => (uiProps.value.clearable as boolean | undefined) ?? true)
const disabled = computed<boolean>(() =>
  Boolean((uiProps.value.disabled as boolean | undefined) ?? props.context.disabled ?? false),
)
const bordered = computed<boolean>(() => (uiProps.value.bordered as boolean | undefined) ?? true)
const readonly = computed<boolean>(() => (uiProps.value.readonly as boolean | undefined) ?? false)
const round = computed<boolean>(() => (uiProps.value.round as boolean | undefined) ?? false)
const autofocus = computed<boolean>(() => (uiProps.value.autofocus as boolean | undefined) ?? false)
const showCount = computed<boolean>(() => (uiProps.value.showCount as boolean | undefined) ?? false)
const maxlength = computed<number | undefined>(() => {
  const v = uiProps.value.maxlength as number | null | undefined
  return v == null ? undefined : v
})
const minlength = computed<number | undefined>(() => {
  const v = uiProps.value.minlength as number | null | undefined
  return v == null ? undefined : v
})
const pair = computed<boolean>(() => Boolean((uiProps.value.pair as boolean | undefined) ?? false))
const separator = computed<string>(() => (uiProps.value.separator as string | undefined) ?? '-')

const inputType = computed(() => {
  const type = props.context.type
  if (type === 'password') return 'password'
  return 'text'
})

const showPasswordOn = computed<InputProps['showPasswordOn']>(() => {
  if (inputType.value !== 'password') return undefined
  return uiProps.value.showPasswordOn as InputProps['showPasswordOn'] | undefined
})

const prefix = computed(() => String((uiProps.value.prefix as string | undefined) ?? '').trim())
const suffix = computed(() => String((uiProps.value.suffix as string | undefined) ?? '').trim())

const isIcon = (value: string) => value.startsWith('i-')

const value = computed(() => {
  const raw = props.context._value as unknown
  if (!pair.value) return (raw ?? '') as string
  if (Array.isArray(raw)) {
    const a = raw[0] ?? ''
    const b = raw[1] ?? ''
    return [String(a), String(b)] as [string, string]
  }
  if (typeof raw === 'string') {
    const parts = raw.split(separator.value)
    return [parts[0] ?? '', parts[1] ?? ''] as [string, string]
  }
  return ['', ''] as [string, string]
})
const placeholder = computed(() => props.context.placeholder as string | undefined)

const bind = computed(() => {
  const b: any = props.context?.node?.props?.__bind
  return b && typeof b === 'object' ? (b as Record<string, unknown>) : {}
})

const runEvent = async (key: string, event: unknown, extra?: Record<string, unknown>) => {
  const code = bind.value[key]
  if (typeof code !== 'string' || !code.trim()) return
  const $ = createSchemaRuntimeContext(props.context, event, extra)
  await runBindCode(code, {
    event,
    data: props.context?.node?.root?.value,
    attrs: props.context?.attrs,
    $,
  })
}

async function handleUpdateValue(next: string | [string, string]) {
  props.context.node.input(next)
  await runEvent('onInput', next, { $value: next })
  await runEvent('onChange', next, { $value: next })
}

const handleFocus = async (e: FocusEvent) => {
  await runEvent('onFocus', e)
}

const handleBlur = async (e: FocusEvent) => {
  await runEvent('onBlur', e)
  props.context.handlers.blur(e)
}
</script>

<template>
  <NInput
    :value="value"
    :type="inputType"
    :show-password-on="showPasswordOn"
    :size="size"
    :clearable="clearable"
    :disabled="disabled"
    :placeholder="placeholder"
    :input-props="{ id: context.id }"
    :bordered="bordered"
    :readonly="readonly"
    :round="round"
    :autofocus="autofocus"
    :show-count="showCount"
    :maxlength="maxlength"
    :minlength="minlength"
    :pair="pair"
    :separator="separator"
    @update:value="handleUpdateValue"
    @focus="handleFocus"
    @blur="handleBlur"
  >
    <template v-if="prefix" #prefix>
      <span v-if="isIcon(prefix)" :class="[prefix, 'h-4 w-4']"></span>
      <span v-else class="text-xs text-muted-foreground">{{ prefix }}</span>
    </template>
    <template v-if="suffix" #suffix>
      <span v-if="isIcon(suffix)" :class="[suffix, 'h-4 w-4']"></span>
      <span v-else class="text-xs text-muted-foreground">{{ suffix }}</span>
    </template>
  </NInput>
</template>
