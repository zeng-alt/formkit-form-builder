<script setup lang="ts">
import PlaceholderSection from '../common/PlaceholderSection.vue'
import OptionsSourceTabs from '../common/OptionsSourceTabs.vue'
import NaiveBasicSection from '../common/NaiveBasicSection.vue'
</script>

<template>
  <PlaceholderSection />
  <OptionsSourceTabs mode="tree" />
  <NaiveBasicSection
    :size="true"
    :disabled="true"
    :clearable="true"
    :filterable="true"
    :multiple="true"
  />
</template>
