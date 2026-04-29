<script setup lang="ts">
import LabelHelpSection from '../common/LabelHelpSection.vue'
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import OptionsLayoutSection from '../common/OptionsLayoutSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <LabelHelpSection />
  <OptionsSourceTabs />
  <OptionsLayoutSection />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
