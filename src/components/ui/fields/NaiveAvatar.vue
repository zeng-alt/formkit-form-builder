<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NAvatar } from 'naive-ui'
import { computed } from 'vue'
import { getSchemaProps } from './schema-props'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const uiProps = computed<Record<string, unknown>>(() => getSchemaProps(props.context))

const src = computed(() => uiProps.value.src as string | undefined)
const round = computed<boolean>(() => Boolean((uiProps.value.round as boolean | undefined) ?? true))
const bordered = computed<boolean>(() =>
  Boolean((uiProps.value.bordered as boolean | undefined) ?? false),
)
const fallbackText = computed(() => (uiProps.value.fallbackText as string | undefined) ?? '')

const size = computed(() => {
  const raw = uiProps.value.avatarSize as unknown
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return 48
})
</script>

<template>
  <div class="w-full py-2 flex items-center">
    <NAvatar :src="src" :round="round" :size="size" :bordered="bordered">
      {{ fallbackText }}
    </NAvatar>
  </div>
</template>
