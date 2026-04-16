<script setup lang="ts">
import LabelHelpSection from '../common/LabelHelpSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <LabelHelpSection />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>

