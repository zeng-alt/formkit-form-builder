<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NBlockquote } from 'naive-ui'
import { computed } from 'vue'

const props = defineProps<{
  context: FormKitFrameworkContext
}>()

const text = computed(() => String(props.context._value ?? ''))
</script>

<template>
  <NBlockquote>{{ text }}</NBlockquote>
</template>
