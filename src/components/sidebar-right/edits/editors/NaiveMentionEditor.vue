<script setup lang="ts">
import PlaceholderSection from '../common/PlaceholderSection.vue'
import OptionsTagsSection from '../common/OptionsTagsSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <PlaceholderSection />
  <OptionsTagsSection />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
