<script setup lang="ts">
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import OptionsLayoutSection from '../common/OptionsLayoutSection.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <OptionsSourceTabs />
  <OptionsLayoutSection />
  <NaiveBasicSection :size="true" :disabled="true" />
</template>
