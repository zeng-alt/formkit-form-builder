<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NCheckbox, NCheckboxGroup } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

// horizontal 是布局键（wrapper class），不是 NCheckboxGroup 属性
const { config, props } = useSchemaAttrs(context, { omit: ['horizontal'] })

type GroupSize = 'small' | 'medium' | 'large'

const size = computed<GroupSize>(() => {
  const raw = config.size as string | undefined
  if (raw === 'tiny') return 'small'
  if (raw === 'small' || raw === 'medium' || raw === 'large') return raw
  return 'medium'
})
const disabled = computed<boolean>(() => Boolean(context.disabled ?? false))
const horizontal = computed<boolean>(() => (config.horizontal as boolean | undefined) ?? false)

const remoteOptions = ref<Array<{ label: string; value: string | number }>>([])

const optionsRaw = computed(() => config.options as unknown)

const endpoint = computed<string | null>(() => {
  const raw = optionsRaw.value
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const url = (raw as any).endpoint
  return typeof url === 'string' && url.trim() ? url.trim() : null
})

watch(
  endpoint,
  async (url) => {
    if (!url) {
      remoteOptions.value = []
      return
    }
    try {
      const res = await fetch(url)
      const json = (await res.json()) as unknown
      if (!Array.isArray(json)) {
        remoteOptions.value = []
        return
      }
      remoteOptions.value = json
        .map((opt) => {
          if (typeof opt === 'string' || typeof opt === 'number')
            return { label: String(opt), value: opt }
          if (opt && typeof opt === 'object') {
            const value = (opt as Record<string, unknown>).value
            const label = (opt as Record<string, unknown>).label
            if (typeof value === 'string' || typeof value === 'number')
              return { label: String(label ?? value), value }
          }
          return null
        })
        .filter((v): v is { label: string; value: string | number } => v !== null)
    } catch {
      remoteOptions.value = []
    }
  },
  { immediate: true },
)

const options = computed(() => {
  if (endpoint.value) return remoteOptions.value
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

const value = computed(() => {
  const raw = context._value as unknown
  if (Array.isArray(raw)) return raw
  if (raw === null || raw === undefined || raw === '') return []
  return [raw]
})

function handleUpdateValue(next: Array<string | number>) {
  context.node.input(next)
}
</script>

<template>
  <NCheckboxGroup
    v-bind="props"
    :value="value"
    :disabled="disabled"
    :size="size"
    @update:value="handleUpdateValue"
  >
    <div
      :class="
        horizontal ? 'flex flex-row flex-wrap gap-4 w-full py-1' : 'flex flex-col gap-2 w-full py-1'
      "
    >
      <NCheckbox
        v-for="opt in options"
        :key="String(opt.value)"
        :value="opt.value"
        :label="opt.label"
      />
    </div>
  </NCheckboxGroup>
</template>
