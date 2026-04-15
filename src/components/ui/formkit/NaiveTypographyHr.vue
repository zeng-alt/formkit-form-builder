<script setup lang="ts">
import type { FormKitFrameworkContext } from '@formkit/core'
import { NHr } from 'naive-ui'

defineProps<{
  context: FormKitFrameworkContext
}>()
</script>

<template>
  <NHr />
</template>
