<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { InputProps } from 'naive-ui'
import { NInput } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

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

const prefix = computed(() => String((uiProps.value.prefix as string | undefined) ?? '').trim())
const suffix = computed(() => String((uiProps.value.suffix as string | undefined) ?? '').trim())

const isIcon = (value: string) => value.startsWith('i-')

const value = computed(() => (props.context._value ?? '') as string)
const placeholder = computed(() => props.context.placeholder as string | undefined)

function handleUpdateValue(next: string) {
  props.context.node.input(next)
}
</script>

<template>
  <NInput
    :value="value"
    type="textarea"
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
    @update:value="handleUpdateValue"
    @blur="context.handlers.blur"
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
