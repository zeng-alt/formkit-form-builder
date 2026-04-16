<script setup lang="ts">
import { computed } from 'vue'
import type { FormBuilderConfig } from '@/types/env'
import { BuilderProvider, FormBuilder } from '@/index'

const formBuilderConfig = computed<FormBuilderConfig>(() => ({
  apiKey: 'xxxxxxx',
}))
</script>

<template>
  <BuilderProvider :config="formBuilderConfig">
    <FormBuilder />
  </BuilderProvider>
</template>

