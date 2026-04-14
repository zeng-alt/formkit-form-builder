<script setup lang="ts">
import { computed } from "vue";
import type { FormBuilderConfig } from "./types/env";
import FormBuilder from "./builder/BuilderMain.vue";
import BuilderProvider from "./builder/BuilderProvider.vue";

const formBuilderConfig = computed<FormBuilderConfig>(() => ({
  apiKey: "xxxxxxx",
}));
</script>

<template>
  <BuilderProvider :config="formBuilderConfig">
    <FormBuilder />
  </BuilderProvider>
</template>
