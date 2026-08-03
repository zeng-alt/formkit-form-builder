<script setup lang="ts">
import { computed } from 'vue'
import type { FormBuilderConfig } from '@zeng-alt/formkit-form-builder'
import { BuilderProvider, FormBuilder } from '@zeng-alt/formkit-form-builder'

const formBuilderConfig = computed<FormBuilderConfig>(() => ({
  apiKey: 'xxxxxxx',
}))
</script>

<template>
  <BuilderProvider :config="formBuilderConfig">
    <FormBuilder />
  </BuilderProvider>
</template>
