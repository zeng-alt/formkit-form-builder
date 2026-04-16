<script setup lang="ts">
import LabelHelpSection from '../common/LabelHelpSection.vue'
import OptionsTagsSection from '../common/OptionsTagsSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <LabelHelpSection />
  <OptionsTagsSection />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>

