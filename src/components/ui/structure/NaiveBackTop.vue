<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import type { BackTopProps } from 'naive-ui'
import { NBackTop } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const show = computed<boolean | undefined>(() => uiProps.value.show as boolean | undefined)
const right = computed<BackTopProps['right']>(() => (uiProps.value.right as any) ?? 40)
const bottom = computed<BackTopProps['bottom']>(() => (uiProps.value.bottom as any) ?? 40)
const visibilityHeight = computed<number>(
  () => (uiProps.value.visibilityHeight as number | undefined) ?? 180,
)
</script>

<template>
  <NBackTop :show="show" :right="right" :bottom="bottom" :visibility-height="visibilityHeight" />
</template>
