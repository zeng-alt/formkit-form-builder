<script setup lang="ts">
import { FormKitSchema } from '@formkit/vue'
import type { FormKitSchemaFormKit } from '@formkit/core'
import type { DefineComponent } from 'vue'

// Explicit type annotation to avoid TS2883/TS7056 inference issues
const FormKitSchemaTyped = FormKitSchema as DefineComponent<{
  schema: FormKitSchemaFormKit[]
  data: Record<string, unknown>
  library?: Record<string, any>
}>

defineProps<{
  schema: FormKitSchemaFormKit[]
  data: Record<string, unknown>
  library?: Record<string, any>
}>()
</script>

<template>
  <FormKitSchemaTyped
    :schema="schema"
    :data="data"
    :library="library"
  />
</template>
