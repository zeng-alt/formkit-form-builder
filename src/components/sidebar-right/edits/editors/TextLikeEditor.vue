<script setup lang="ts">
import LabelHelpSection from '../common/LabelHelpSection.vue'
import PlaceholderSection from '../common/PlaceholderSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <LabelHelpSection />
  <PlaceholderSection />
  <NaiveBasicSection :size="true" :disabled="true" :clearable="true" />
</template>

