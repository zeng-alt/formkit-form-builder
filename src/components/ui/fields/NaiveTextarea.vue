<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NInput } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import { useBindEvents } from '@/composables/use-bind-events'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// 配置经 context.attrs 响应式流入（属性面板修改即触发重渲染）；prefix/suffix 是插槽内容键
const { config, props, bind } = useSchemaAttrs(context, { omit: ['prefix', 'suffix'] })
const { runEvent } = useBindEvents(context, bind)

const prefix = computed(() => String((config.prefix as string | undefined) ?? '').trim())
const suffix = computed(() => String((config.suffix as string | undefined) ?? '').trim())

const isIcon = (value: string) => value.startsWith('i-')

const value = computed(() => (context._value ?? '') as string)

async function handleUpdateValue(next: string) {
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
  <NInput
    v-bind="props"
    :value="value"
    type="textarea"
    :input-props="{ id: context.id }"
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
