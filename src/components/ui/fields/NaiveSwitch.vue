<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NSwitch } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { props } = useSchemaAttrs(context)

const value = computed<boolean>(() => Boolean(context._value ?? false))

function handleUpdateValue(next: boolean) {
  context.node.input(next)
}
</script>

<template>
  <NSwitch v-bind="props" :value="value" @update:value="handleUpdateValue" />
</template>
