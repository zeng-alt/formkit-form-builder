<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NLi, NOl } from 'naive-ui'
import { computed } from 'vue'
import { useSchemaAttrs } from '../formkit/use-schema-attrs'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const { context } = defineProps<{
  context: FormKitFrameworkContext
}>()

const { config } = useSchemaAttrs(context)

const items = computed(() => {
  const raw = config.options as unknown
  if (!Array.isArray(raw)) return []
  return raw.map((v) => String(v))
})
</script>

<template>
  <NOl>
    <NLi v-for="(item, idx) in items" :key="idx">
      <InlineEditableText :context="context" prop-key="options" :prop-index="idx" :value="item" />
    </NLi>
  </NOl>
</template>
