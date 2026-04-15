<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NLi, NUl } from 'naive-ui'
import { computed } from 'vue'

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
    <NLi v-for="(item, idx) in items" :key="idx">{{ item }}</NLi>
  </NUl>
</template>
