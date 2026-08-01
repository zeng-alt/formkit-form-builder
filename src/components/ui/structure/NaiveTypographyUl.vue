<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NLi, NUl } from 'naive-ui'
import { computed } from 'vue'
import InlineEditableText from '../formkit/InlineEditableText.vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const items = computed(() => {
  const raw = props.context.options as unknown
  if (!Array.isArray(raw)) return []
  return raw.map((v) => String(v))
})
</script>

<template>
  <NUl>
    <NLi v-for="(item, idx) in items" :key="idx">
      <InlineEditableText :context="props.context" prop-key="options" :prop-index="idx" :value="item" />
    </NLi>
  </NUl>
</template>
